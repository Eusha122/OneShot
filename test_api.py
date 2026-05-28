import httpx
import asyncio
import json

async def main():
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            res = await client.post("http://127.0.0.1:8000/api/exams/generate", json={
                "subject": "Physics",
                "topic": "Newton's laws",
                "count": 2,
                "type": "mcq"
            })
            print(f"Status: {res.status_code}")
            print(json.dumps(res.json(), indent=2))
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(main())
