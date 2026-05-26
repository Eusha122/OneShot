import asyncio
from app.db.database import sessionmanager
from app.db.repositories import LearnerRepository
from app.schemas.domain import LearnerProfileCreate

async def main():
    async with sessionmanager.session() as session:
        repo = LearnerRepository(session)
        data = LearnerProfileCreate(language_preference="en")
        learner = await repo.create(data)
        await session.commit()
        print("Success:", learner.id)

if __name__ == "__main__":
    asyncio.run(main())
