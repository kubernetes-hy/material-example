const k8s = require('@kubernetes/client-node')
const mustache = require('mustache')
const request = require('request')
const JSONStream = require('json-stream')
const fs = require('fs').promises

let time = Number(process.argv[2]) || 10

const countdown = () => {
//  console.log('Time:', time)

  if (time > 0) time--

  setTimeout(() => countdown(), 1200) // Dramatic timing
}

countdown()

// The loop prevents graceful exits

const signals = {
  'SIGHUP': 1,
  'SIGINT': 2,
  'SIGTERM': 15
};

Object.keys(signals).forEach(s => {
  process.on(s, () => process.exit(128 + signals[s]))
})

// Use Kubernetes client to interact with Kubernetes

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const opts = {}
kc.applyToRequest(opts)

const client = kc.makeApiClient(k8s.CoreV1Api);

const sendRequestToApi = async (api, method = 'get', options = undefined) => new Promise((resolve, reject) => request[method](`${kc.getCurrentCluster().server}${api}`, {...opts, ...options}, (err, res) => err ? reject(err) : resolve(JSON.parse(res.body))))

const fieldsFromObject = (object) => ({
  name: `${object.metadata.name}-countdown`,
  deployment_name: `${object.metadata.name}-countdown-dep`,
  namespace: object.metadata.namespace,
  image: object.spec.image,
  length: object.spec.length
})

const getDeploymentYAML = async (object) => {
  const deploymentTemplate = await fs.readFile("deployment.mustache", "utf-8")
  const fields = fieldsFromObject(object)
  return mustache.render(deploymentTemplate, fields)
}

const createDeployment = async (object) => {
  const yaml = await getDeploymentYAML(object)
  const { namespace } = fieldsFromObject(object)
  sendRequestToApi(`/apis/apps/v1/namespaces/${namespace}/deployments`, 'post', {
    headers: {
      'Content-Type': 'application/yaml'
    },
    body: yaml
  })
}

const removeDeployment = async (object) => {
  const { namespace, deployment_name } = fieldsFromObject(object)
  sendRequestToApi(`/apis/apps/v1/namespaces/${namespace}/deployments/${deployment_name}`, 'delete')
}

const maintainStatus = async () => {
  (await client.listNode()).body // A bug in the client(?) was fixed by sending a request and not caring about response

  const stream = new JSONStream()
  stream.on('data', async ({ type, object }) => {
    if (type === 'ADDED') {
      createDeployment(object)
    }
    if (type === 'DELETED') {
      removeDeployment(object)
    }
  })
  request.get(`${kc.getCurrentCluster().server}/apis/stable.dwk/v1/countdowns?watch=true`, opts).pipe(stream)
}

maintainStatus().catch(err => console.log('WHAT', err))