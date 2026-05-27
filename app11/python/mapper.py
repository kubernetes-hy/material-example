import asyncio
import json
import os
import random

from nats.aio.client import Client as NATS

NATS_URL = os.getenv("NATS_URL", "nats://nats:4222")

nc = NATS()
preoccupied = False


async def process_data(payload: dict) -> None:
    data = payload["data"]
    index = payload["index"]

    print("Processing...")
    await asyncio.sleep(random.random() * 10)

    fullnames = [{"id": person["uuid"], "name": f"{person['fn']} {person['ln']}"} for person in data]
    result_payload = {"index": index, "data": fullnames}

    await nc.publish("saver_data", json.dumps(result_payload).encode())
    print("Data was sent")


async def set_ready_to_process() -> None:
    global preoccupied

    sub = None

    async def mapper_data_cb(msg):
        nonlocal sub
        global preoccupied

        preoccupied = True
        if sub is not None:
            await sub.unsubscribe()

        try:
            payload = json.loads(msg.data.decode())
            await process_data(payload)
        except Exception as err:
            print(f"Processing mapper_data failed: {err}")
        finally:
            await set_ready_to_process()

    sub = await nc.subscribe("mapper_data", queue="mapper.workers", cb=mapper_data_cb)
    preoccupied = False
    await nc.publish("mapper_status", b"im_listening")


async def mapper_status_cb(msg):
    global preoccupied

    if preoccupied:
        return
    if msg.data.decode() == "anyone_listening":
        await nc.publish("mapper_status", b"im_listening")


async def main() -> None:
    await nc.connect(servers=[NATS_URL])
    await nc.subscribe("mapper_status", cb=mapper_status_cb)
    await set_ready_to_process()

    print("Mapper listening")
    await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
