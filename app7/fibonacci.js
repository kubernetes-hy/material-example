const asyncWait = (ms) => new Promise((res) => { setTimeout(res, ms) })

const fibonacci = async (number) => {
  if (number < 2) return 1
  await asyncWait(1)
  return (await fibonacci(number - 2)) + (await fibonacci(number - 1))
}

process.on('message', async (msg) => {
  console.log('started fibo with', msg)
  const solved = await fibonacci(msg)
  console.log(`Fibonacci ${msg}: ${solved}`)
})
