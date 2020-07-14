const k8s = require('@kubernetes/client-node')
const mustache = require('mustache')
const request = require('request')
const JSONStream = require('json-stream')
const fs = require('fs').promises

// Use Kubernetes client to interact with Kubernetes

const JOB_IDENTIFIER = 'countdown-345'

const timeouts = {}

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const opts = {}
kc.applyToRequest(opts)

const client = kc.makeApiClient(k8s.CoreV1Api);

const sendRequestToApi = async (api, method = 'get', options = undefined) => new Promise((resolve, reject) => request[method](`${kc.getCurrentCluster().server}${api}`, {...opts, ...options}, (err, res) => err ? reject(err) : resolve(JSON.parse(res.body))))

const fieldsFromCountdown = (object) => ({
  countdown_name: object.metadata.name,
  container_name: object.metadata.name,
  job_name: `${object.metadata.name}-job-${object.spec.length}`,
  namespace: object.metadata.namespace,
  delay: object.spec.delay,
  image: object.spec.image,
  length: object.spec.length
})

const fieldsFromJob = (object) => ({
  countdown_name: object.metadata.labels.countdown,
  container_name: object.spec.template.spec.containers[0].name,
  job_name: `${object.spec.template.spec.containers[0].name}-job-${object.metadata.labels.length}`,
  namespace: object.metadata.namespace,
  delay: object.metadata.labels.delay,
  image: object.spec.template.spec.containers[0].image,
  length: object.metadata.labels.length
})

const getJobYAML = async (fields) => {
  const deploymentTemplate = await fs.readFile("job.mustache", "utf-8")
  return mustache.render(deploymentTemplate, fields)
}

const jobForCountdownAlreadyExists = async (fields) => {
  const { countdown_name, namespace } = fields
  const { items } = await sendRequestToApi(`/apis/batch/v1/namespaces/${namespace}/jobs`)

  const alreadyExistingItem = items.find(item => item.metadata.labels.countdown === countdown_name)

  if (alreadyExistingItem) return true

  return false
}

const createJob = async (fields) => {
  const yaml = await getJobYAML(fields)
  const { namespace } = fields
  console.log('scheduling new job', fields.length)
  return sendRequestToApi(`/apis/batch/v1/namespaces/${namespace}/jobs`, 'post', {
    headers: {
      'Content-Type': 'application/yaml'
    },
    body: yaml
  })
}

const removeJob = async ({ namespace, job_name }) => {
  const pods = await sendRequestToApi(`/api/v1/namespaces/${namespace}/pods/`)
  const pod = pods.items.find(pod => pod.metadata.labels['job-name'] === job_name)
  if (pod) removePod({ namespace, pod_name: pod.metadata.name })

  return sendRequestToApi(`/apis/batch/v1/namespaces/${namespace}/jobs/${job_name}`, 'delete')
}

const removeCountdown = async ({ namespace, countdown_name }) => {
  return sendRequestToApi(`/apis/stable.dwk/v1/namespaces/${namespace}/countdowns/${countdown_name}`, 'delete')
}

const removePod = ({ namespace, pod_name }) => {
  return sendRequestToApi(`/api/v1/namespaces/${namespace}/pods/${pod_name}`, 'delete')
}

const cleanupForCountdown = async ({ namespace, countdown_name }) => {
  console.log('Doing cleanup')
  clearTimeout(timeouts[countdown_name])

  const jobs = await sendRequestToApi(`/apis/batch/v1/namespaces/${namespace}/jobs`)
  jobs.items.forEach(job => {
    if (!job.metadata.labels.countdown === countdown_name) return
    removeJob({ namespace, job_name: job.metadata.name })
  })
}

const rescheduleJob = (jobObject) => {
  const fields = fieldsFromJob(jobObject)
  if (Number(fields.length) <= 1) {
    console.log('Removing countdown')
    removeCountdown(fields)
    return
  }
  timeouts[fields.countdown_name] = setTimeout(() => {
    removeJob(fields)
    const newLength = Number(fields.length) - 1
    const newFields = {
      ...fields,
      job_name: `${fields.container_name}-job-${newLength}`,
      length: newLength
    }
    createJob(newFields)
  }, Number(fields.delay))
}

const maintainStatus = async () => {
  (await client.listNode()).body // A bug in the client(?) was fixed by sending a request and not caring about response

  const countdown_stream = new JSONStream()
  countdown_stream.on('data', async ({ type, object }) => {
    if (type === 'ADDED') {
      const fields = fieldsFromCountdown(object)
      if (await jobForCountdownAlreadyExists(fields)) return
      createJob(fields)
    }
    if (type === 'DELETED') {
      const fields = fieldsFromCountdown(object)      
      cleanupForCountdown(fields)
    }
  })
  request.get(`${kc.getCurrentCluster().server}/apis/stable.dwk/v1/countdowns?watch=true`, opts).pipe(countdown_stream)

  const job_stream = new JSONStream()

  job_stream.on('data', async ({ type, object }) => {
    if (!object.metadata.labels.countdown) return // If it's not countdown don't handle
    if (type === 'DELETED' || object.metadata.deletionTimestamp) return // Do not handle deleted jobs
    if (!object?.status?.succeeded) return

    rescheduleJob(object)
  })

  request.get(`${kc.getCurrentCluster().server}/apis/batch/v1/jobs?watch=true`, opts).pipe(job_stream)
}

maintainStatus()