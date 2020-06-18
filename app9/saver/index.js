const NATS = require('nats')
const nc = NATS.connect({
  url: 'nats://nats:4222'
})
 
nc.subscribe('saver_data', { queue: 'saver.workers' }, (msg) => {
  const payload = JSON.parse(msg)
  const { index, data } = payload
  console.log(`Received package ${index}. And data of length: ${data.length}`)
  // Imagine doing some saving here
  nc.publish('processed_data', String(index))
})

console.log('Saver listening')