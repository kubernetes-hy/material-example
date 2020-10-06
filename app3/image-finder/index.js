const Koa = require('koa')
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const app = new Koa()
const PORT = process.env.PORT || 3001

const directory = path.join('/', 'usr', 'src', 'app', 'files')
const filePath = path.join(directory, 'image.jpg')

const fileAlreadyExists = async () => new Promise(res => {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats) return res(false)
    return res(true)
  })
})

const findAFile = async () => {
  if (await fileAlreadyExists()) return

  await new Promise(res => fs.mkdir(directory, (err) => res()))
  const response = await axios.get('https://picsum.photos/200', { responseType: 'stream' })
  response.data.pipe(fs.createWriteStream(filePath))
}

const removeFile = async () => new Promise(res => fs.unlink(filePath, (err) => res()))

app.use(async ctx => {
  if (ctx.path.includes('favicon.ico')) return
  // Get a new image
  await removeFile()
  findAFile()
  ctx.status = 200
});

console.log('Started')

findAFile()

app.listen(PORT)
