import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

async def main():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        try:
            response = await ac.post("/api/conversations/", json={"learner_id": None, "title": "Test Conversation"})
            print("Status:", response.status_code)
            print("Body:", response.text)
        except Exception as e:
            print("Exception:", str(e))

if __name__ == "__main__":
    asyncio.run(main())
