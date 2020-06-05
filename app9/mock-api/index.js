const faker = require('faker')
const express = require('express')
const PORT = process.env.PORT || 3000
const seed = 123
faker.seed(Number(seed))

const app = express()

app.get('/', (req, res) => {
  let people = []

  for (let i = 0; i < 100; i++) {
    people.push({ uuid: faker.random.uuid(), fn: faker.name.firstName(), ln: faker.name.lastName(), friends: new Set() })
  }

  for (person of people) {
    for (friend of people) {
      if (faker.random.number() % 50 <= 2) {
        person.friends.add(friend.uuid)
        friend.friends.add(person.uuid)
      }
    }
  }

  return res.json(people.map(p => ({ ...p, friends: Array.from(p.friends)})))
})


app.listen(PORT, () => console.log(`listening in ${PORT}`))