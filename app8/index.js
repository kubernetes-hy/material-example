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
    }, 20 * 1000)
    return false
  }
  const deadFromRandom = (Math.random() * 100) > 50
  if (deadFromRandom) console.log('Luck was not on our side')
  if (!deadFromRandom) console.log('Luckily we survived')
  return deadFromRandom
}

router.get('/healthz', ctx => {
  ctx.status = iAmDead ? 500 : 200

  console.log(`Received a request to healthz and responding with status ${ctx.status}`)
  iAmDead = amIDead()
})


app.use(router.routes())

app.listen(PORT, () => { 
  iAmDead = amIDead()
  console.log(`Started in port ${PORT}`) 
})
