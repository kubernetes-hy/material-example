const Koa = require('koa')
const axios = require('axios')
const app = new Koa()
const PORT = process.env.NODE_ENV || 3000

const SEED = Math.random().toString(36).substr(2, 6)

const IMAGE_URL = `https://picsum.photos/seed/${SEED}/200/200`

const copyHeaders = ['content-type', 'content-length']

app.use(async ctx => {
  if (ctx.path.includes('favicon.ico')) return
  console.log('Received a request')

  const response = await axios.get(IMAGE_URL, { responseType: 'stream' })
  ctx.body = response.data
  ctx.set('content-disposition', 'inline;')
  copyHeaders.forEach(header => ctx.set(header, response.headers[header]))
  ctx.status = 200
});

app.listen(PORT, () => { console.log(`Started in port ${PORT}`)})
