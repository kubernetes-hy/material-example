const Koa = require('koa')
const app = new Koa()
const PORT = process.env.NODE_ENV || 3001
const { fork } = require('child_process')
const path = require('path')

app.use(async ctx => {
  if (ctx.path.includes('favicon.ico')) return
  console.log('Received a request')
  const utilize = fork(path.join(__dirname, 'fibonacci.js'))
  utilize.send(30)
  ctx.status = 200
});

app.listen(PORT, () => { console.log(`Started in port ${PORT}`) })
