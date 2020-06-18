const { getUsers } = require('./mock_api')
const NATS = require('nats')
const nc = NATS.connect({
  url: 'nats://nats:4222'
})

/*
100000+ items in an API

The fetcher is configured to get the data in chunks of 1000 from the API and pass it along to mappers. (NATS)

The mappers get data from fetcher (NATS), do modifications to the data, these include time consuming operations, and pass the modified data to saver. (NATS)

The saver collects the data from mapper (NATS) and saves it to X
*/


/**
 * Checks if anyone is ready to receive data.
 */
const confirmConnection = async () => {
  const ready = await new Promise(resolve => {
    let subscription
    subscription = nc.subscribe('mapper_status', (msg) => {
      if (msg !== 'im_listening') return
      resolve(subscription)
    })
    nc.publish('mapper_status', 'anyone_listening')
  })
  nc.unsubscribe(ready)
}

const sendNextPackage = async (index) => {
  await confirmConnection()
  const payload = {
    index: index,
    data: getUsers(index)
  }
  nc.publish('mapper_data', JSON.stringify(payload))
}

let packageIds = []

nc.subscribe('processed_data', (msg) => {
  packageIds = packageIds.filter(val => Number(val) !== Number(msg))
})

const initialize = () => {
  for (let i = 0; i < 1000; i++) {
    packageIds.push(i)
  }
}

const main = async () => {
  initialize()
  while (packageIds.length) {
    const nextToBeProcessed = packageIds[Math.floor(Math.random() * packageIds.length)]
    console.log(`Ready to send #${nextToBeProcessed}`)
    await sendNextPackage(nextToBeProcessed)
    console.log(`Sent data #${nextToBeProcessed}, ${packageIds.length} remaining`)
  }
  console.log('DONE WITH ALL DATA, RESTARTING PROCESS FOR FUN')
  main()
}

main()
