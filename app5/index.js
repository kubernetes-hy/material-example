const redis = require("redis")
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost'
})

let errorMessaged = false

client.on("ready", () => {
  console.log('Connected')
  errorMessaged = false
})

client.on("error", function (error) {
  if (errorMessaged) return
  console.error('Connection errored')
  errorMessaged = true
});

const spaces = (number) => {
  let whitespace = ''
  for (let i = 0; i < number; i++) {
    whitespace += ' '
  }
  return whitespace
}

const rail = '|---|'

const asyncGet = (key) => new Promise((res, rej) => client.get(key, (err, reply) => err ? rej(err) : res(reply)))

const getRailroad = async () => {
  const direction = Number(await asyncGet('direction') || 1)
  const value = await asyncGet('railroad') 
  const oldSpaces = value ? value.length - rail.length : 4
  const newSpaces = oldSpaces + direction
  client.set('railroad', `${spaces(newSpaces)}${rail}`)
  if (newSpaces > 30) client.set('direction', -1)
  if (newSpaces < 2) client.set('direction', 1)
  return `${newSpaces}${value}`
}

const loop = async () => {
  const railroad = await getRailroad()
  console.log(railroad)
  setTimeout(loop, 200)
}

loop()