const NATS = require('nats')
const nc = NATS.connect({
  url: process.env.NATS_URL || 'nats://nats:4222'
})

let preoccupied = false

nc.subscribe('mapper_status', (msg) => {
  if (preoccupied) return
  if (msg == 'anyone_listening') return nc.publish('mapper_status', 'im_listening')
})

const setReadyToProcess = () => {
  const data_subscription = nc.subscribe('mapper_data', { queue: 'mapper.workers' }, (msg) => {
    preoccupied = true
    nc.unsubscribe(data_subscription)
    processData(JSON.parse(msg))
  })
  preoccupied = false
  nc.publish('mapper_status', 'im_listening')
}

const simpleWait = ms => new Promise(resolve => setTimeout(resolve, ms))

const processData = async ({ data, index }) => {
  console.log('Processing...')
  await simpleWait(Math.random() * 10000)  // Some serious data processing happens here
  const fullnames = data.map(person => ({ id: person.uuid, name: `${person.fn} ${person.ln}` }))
  const payload = {
    index: index,
    data: fullnames
  }
  sendProcessedData(payload)
}

const sendProcessedData = (payload) => {
  nc.publish('saver_data', JSON.stringify(payload))
  console.log('Data was sent')
  setReadyToProcess()
}

setReadyToProcess()
console.log('Mapper listening')