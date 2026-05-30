import asyncio
from app.services.ai.ollama_client import ollama_client

async def main():
    print("Checking health...")
    health = await ollama_client.check_health()
    print("Health:", health)
    
    print("Testing generate...")
    response = await ollama_client.generate(prompt="hello", history=[])
    print("Response:", response)

if __name__ == "__main__":
    asyncio.run(main())
