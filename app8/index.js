const Koa = require('koa');
const Router = require('@koa/router');

const app = new Koa();
const router = new Router();
const PORT = 3541

// working, broken, random, delayed_broken
const version = process.env.VERSION || 'random'

let iAmDead = false

const amIDead = () => {
  if (iAmDead) return true
  if (version === 'working') return false
  if (version === 'broken') return true
  if (version === 'delayed_broken') {
    console.log('Will die soon')
    setTimeout(() => {
      iAmDead = true
      console.log('I died')
    }, 60 * 1000)
    return false
  }
  const deadFromRandom = (Math.random() * 100) > 90
  if (deadFromRandom) console.log('Luck was not on our side')
  if (!deadFromRandom) console.log('Luckily we survived')
  return deadFromRandom
}

router.get('/', ctx => {
  ctx.status = iAmDead ? 500 : 200
  const status = iAmDead ? 'broken' : 'working'
  ctx.body = `app status: ${status}\nversion: ${version}`
})

router.get('/healthz', ctx => {
  ctx.status = iAmDead ? 500 : 200

  console.log(`Received a request to healthz and responding with status ${ctx.status}`)
  iAmDead = amIDead()
})

app.use(router.routes())

app.listen(PORT, () => { 
  iAmDead = amIDead()
  console.log(`Version ${version} started in port ${PORT}`) 
})
