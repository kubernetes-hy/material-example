const { getUsers } = require("./mock_api")
const { connect } = require("@nats-io/transport-node")

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const encode = (value) => encoder.encode(value)
const decode = (value) => decoder.decode(value)
let nc

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
  await new Promise((resolve, reject) => {
    const subscription = nc.subscribe("mapper_status", {
      callback: (err, msg) => {
        if (err) {
          subscription.unsubscribe()
          return reject(err)
        }

        if (decode(msg.data) !== "im_listening") return
        subscription.unsubscribe()
        resolve()
      },
    })

    nc.publish("mapper_status", encode("anyone_listening"))
  })
}

const sendNextPackage = async (index) => {
  await confirmConnection()
  const payload = {
    index: index,
    data: getUsers(index),
  }
  nc.publish("mapper_data", encode(JSON.stringify(payload)))
}

let packageIds = []

const initialize = () => {
  for (let i = 0; i < 1000; i++) {
    packageIds.push(i)
  }
}

const main = async () => {
  initialize()
  while (packageIds.length) {
    const nextToBeProcessed =
      packageIds[Math.floor(Math.random() * packageIds.length)]
    console.log(`Ready to send #${nextToBeProcessed}`)
    await sendNextPackage(nextToBeProcessed)
    console.log(
      `Sent data #${nextToBeProcessed}, ${packageIds.length} remaining`,
    )
  }
  console.log("DONE WITH ALL DATA, RESTARTING PROCESS FOR FUN")
  main()
}

const start = async () => {
  nc = await connect({
    servers: process.env.NATS_URL || "nats://nats:4222",
  })

  nc.subscribe("processed_data", {
    callback: (err, msg) => {
      if (err) {
        console.error("Failed to receive processed_data event", err)
        return
      }

      const id = decode(msg.data)
      packageIds = packageIds.filter((val) => Number(val) !== Number(id))
    },
  })

  main()
}

start().catch((err) => {
  console.error("Failed to connect to NATS", err)
  process.exit(1)
})
