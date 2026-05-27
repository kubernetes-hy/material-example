import asyncio
import json
import os

from nats.aio.client import Client as NATS

NATS_URL = os.getenv("NATS_URL", "nats://nats:4222")


async def main() -> None:
    nc = NATS()
    await nc.connect(servers=[NATS_URL])

    async def saver_data_cb(msg):
        payload = json.loads(msg.data.decode())
        index = payload["index"]
        data = payload["data"]

        print(f"Received package {index}. And data of length: {len(data)}")
        await nc.publish("processed_data", str(index).encode())

    await nc.subscribe("saver_data", queue="saver.workers", cb=saver_data_cb)
    print("Saver listening")

    await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
