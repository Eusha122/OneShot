import httpx, asyncio, json

async def test():
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post("http://localhost:11434/api/chat", json={
            "model": "qwen2.5:1.5b",
            "messages": [{"role": "user", "content": "Say hi"}],
            "stream": False
        })
        print(f"Status: {r.status_code}")
        print(f"Body: {r.text[:200]}")

asyncio.run(test())
