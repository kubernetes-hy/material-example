const getHashNow = () => {
  const randomHash = Math.random().toString(36).substr(2, 6)

  console.log(randomHash)

  setTimeout(getHashNow, 5000)
}

getHashNow()