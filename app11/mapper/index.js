const { connect } = require("@nats-io/transport-node")

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const encode = (value) => encoder.encode(value)
const decode = (value) => decoder.decode(value)
let nc

let preoccupied = false

const setReadyToProcess = () => {
  const dataSubscription = nc.subscribe("mapper_data", {
    queue: "mapper.workers",
    callback: (err, msg) => {
      if (err) {
        console.error("Failed to receive mapper_data", err)
        return
      }

      preoccupied = true
      dataSubscription.unsubscribe()
      processData(JSON.parse(decode(msg.data))).catch((processingErr) => {
        console.error("Processing mapper_data failed", processingErr)
        setReadyToProcess()
      })
    },
  })

  preoccupied = false
  nc.publish("mapper_status", encode("im_listening"))
}

const simpleWait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const processData = async ({ data, index }) => {
  console.log("Processing...")
  await simpleWait(Math.random() * 10000) // Some serious data processing happens here
  const fullnames = data.map((person) => ({
    id: person.uuid,
    name: `${person.fn} ${person.ln}`,
  }))
  const payload = {
    index: index,
    data: fullnames,
  }
  sendProcessedData(payload)
}

const sendProcessedData = (payload) => {
  nc.publish("saver_data", encode(JSON.stringify(payload)))
  console.log("Data was sent")
  setReadyToProcess()
}

const start = async () => {
  nc = await connect({
    servers: process.env.NATS_URL || "nats://nats:4222",
  })

  nc.subscribe("mapper_status", {
    callback: (err, msg) => {
      if (err) {
        console.error("Failed to receive mapper_status", err)
        return
      }

      if (preoccupied) return
      if (decode(msg.data) === "anyone_listening") {
        nc.publish("mapper_status", encode("im_listening"))
      }
    },
  })

  setReadyToProcess()
  console.log("Mapper listening")
}

start().catch((err) => {
  console.error("Failed to connect to NATS", err)
  process.exit(1)
})
