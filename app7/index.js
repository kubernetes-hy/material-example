const Koa = require('koa')
const app = new Koa()
const PORT = process.env.NODE_ENV || 3001
const FIBOS = process.env.FIBOS || 20
const { fork } = require('child_process')
const path = require('path')

let concurrent = 0

app.use(async ctx => {
  if (ctx.path.includes('favicon.ico')) return
  const fibos = ctx.query.fibos || FIBOS
  console.log('Received a request')
  const utilize = fork(path.join(__dirname, 'fibonacci.js'))
  utilize.send(fibos)
  concurrent++
  utilize.on("close", (msg) => {
    console.log('Closed')
    concurrent--
  })
  ctx.body = `Concurrently: ${concurrent}`
  ctx.status = 200
});

app.listen(PORT, () => { console.log(`Started in port ${PORT}`) })
