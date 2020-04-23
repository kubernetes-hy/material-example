const redis = require("redis")
const client = redis.createClient({
  host: 'redis'
})

client.on("error", function (error) {
  console.error(error)
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

const getAndPrint = async () => {
  const direction = Number(await asyncGet('direction') || 1)
  const value = await asyncGet('railroad') || `${spaces(5)}${rail}`
  const oldSpaces = value.length - rail.length
  console.log(`${oldSpaces}${value}`)

  const newSpaces = oldSpaces + direction
  client.set('railroad', `${spaces(newSpaces)}${rail}`)
  if (newSpaces > 30) client.set('direction', -1)
  if (newSpaces < 2) client.set('direction', 1)
}


setInterval(getAndPrint, 100)
