import asyncio
import json
import os
import random

from nats.aio.client import Client as NATS

from mock_api import get_users

NATS_URL = os.getenv("NATS_URL", "nats://nats:4222")

nc = NATS()
pending_packages: set[int] = set()


async def confirm_connection() -> None:
    loop = asyncio.get_running_loop()
    ready = loop.create_future()

    async def mapper_status_cb(msg):
        if msg.data.decode() != "im_listening":
            return
        if not ready.done():
            ready.set_result(True)

    sub = await nc.subscribe("mapper_status", cb=mapper_status_cb)
    await nc.publish("mapper_status", b"anyone_listening")
    await ready
    await sub.unsubscribe()


async def send_next_package(index: int) -> None:
    await confirm_connection()
    payload = {"index": index, "data": get_users(index)}
    await nc.publish("mapper_data", json.dumps(payload).encode())


async def processed_data_cb(msg):
    try:
        package_id = int(msg.data.decode())
        pending_packages.discard(package_id)
    except ValueError:
        pass


def initialize() -> None:
    pending_packages.clear()
    pending_packages.update(range(1000))


async def main() -> None:
    await nc.connect(servers=[NATS_URL])
    await nc.subscribe("processed_data", cb=processed_data_cb)

    while True:
        initialize()
        while pending_packages:
            next_package = random.choice(tuple(pending_packages))
            print(f"Ready to send #{next_package}")
            await send_next_package(next_package)
            print(f"Sent data #{next_package}, {len(pending_packages)} remaining")

        print("DONE WITH ALL DATA, RESTARTING PROCESS FOR FUN")


if __name__ == "__main__":
    asyncio.run(main())
