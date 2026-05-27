import random
from faker import Faker


def get_users(index: int) -> list[dict]:
    faker = Faker()
    Faker.seed(index)
    rng = random.Random(index)

    people: list[dict] = []
    for _ in range(100):
        people.append(
            {
                "uuid": faker.uuid4(),
                "fn": faker.first_name(),
                "ln": faker.last_name(),
                "friends": set(),
            }
        )

    for person in people:
        for friend in people:
            if rng.randint(0, 2**31 - 1) % 50 <= 2:
                person["friends"].add(friend["uuid"])
                friend["friends"].add(person["uuid"])

    return [
        {
            "uuid": p["uuid"],
            "fn": p["fn"],
            "ln": p["ln"],
            "friends": list(p["friends"]),
        }
        for p in people
    ]
