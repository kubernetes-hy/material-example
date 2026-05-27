const { connect } = require("@nats-io/transport-node")

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const encode = (value) => encoder.encode(value)
const decode = (value) => decoder.decode(value)

const start = async () => {
  const nc = await connect({
    servers: process.env.NATS_URL || "nats://nats:4222",
  })

  nc.subscribe("saver_data", {
    queue: "saver.workers",
    callback: (err, msg) => {
      if (err) {
        console.error("Failed to receive saver_data", err)
        return
      }

      const payload = JSON.parse(decode(msg.data))
      const { index, data } = payload
      console.log(
        `Received package ${index}. And data of length: ${data.length}`,
      )
      // Imagine doing some saving here
      nc.publish("processed_data", encode(String(index)))
    },
  })

  console.log("Saver listening")
}

start().catch((err) => {
  console.error("Failed to connect to NATS", err)
  process.exit(1)
})
