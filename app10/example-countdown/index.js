let time = Number(process.argv[2]) || 10

const countdown = () => {
  if (time < 3) console.log('Time is coming to an end!')

  console.log('Time:', time)

//  if (time > 0) time--

//  setTimeout(() => countdown(), 1200) // Dramatic timing
}

countdown()

// The loop prevents graceful exits

const signals = {
  'SIGHUP': 1,
  'SIGINT': 2,
  'SIGTERM': 15
};

Object.keys(signals).forEach(s => {
  process.on(s, () => process.exit(128 + signals[s]))
})