const faker = require('faker')

const getUsers = (index) => {
  faker.seed(index)

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

  return people.map(p => ({ ...p, friends: Array.from(p.friends)}))
}


module.exports = {
  getUsers
}