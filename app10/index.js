const countdown = (time) => {
  if (time < 0) time = 0
  console.log('Time:', time)

  setTimeout(() => countdown(time - 1), 1200) // Dramatic timing
}

countdown(Number(process.argv[2]) || 10)
