const countdown = (time) => {
  if (time < 0) time = 0
  console.log('Time:', time)

  setTimeout(() => countdown(time - 1), 1200) // Dramatic timing
}

countdown(Number(process.argv[2]) || 10)

// The loop above prevents graceful exits

const signals = {
  'SIGHUP': 1,
  'SIGINT': 2,
  'SIGTERM': 15
};

Object.keys(signals).forEach(s => {
  process.on(s, () => process.exit(128 + signals[s]))
})