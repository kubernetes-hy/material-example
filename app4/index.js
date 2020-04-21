require('dotenv').config()
const Koa = require('koa')
const axios = require('axios')
const app = new Koa()
const PORT = process.env.NODE_ENV || 3001
const API_KEY = process.env.API_KEY

if (!API_KEY) throw new Error('No value for API_KEY environment variable')

const querySettings = {
  q: 'red+sky',
  image_type: 'all',
  safesearch: true,
  key: API_KEY
}

const copyHeaders = ['content-type', 'content-length']

app.use(async ctx => {
  if (ctx.path.includes('favicon.ico')) return

  const query = Object.entries(querySettings).map(([key, val]) => `${key}=${val}`).join('&')
  let image
  try {
    const response = await axios.get(`https://pixabay.com/api/?${query}`)
    if (!(response.data.hits || []).length) throw new Error('Bad query')
    image = response.data.hits[0]
  } catch (err) {
    console.log('Unable to get data.', err.message)
    return ctx.status = 500
  }
  const response = await axios.get(image.previewURL, { responseType: 'stream' })
  ctx.body = response.data
  ctx.set('content-disposition', 'inline;')
  copyHeaders.forEach(header => ctx.set(header, response.headers[header]))
  ctx.status = 200
});

console.log('Started')

app.listen(PORT)
