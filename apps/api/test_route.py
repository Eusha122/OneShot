import asyncio
from app.db.database import sessionmanager
from app.api.routes.learners import create_learner
from app.schemas.domain import LearnerProfileCreate

async def main():
    async with sessionmanager.session() as session:
        data = LearnerProfileCreate(language_preference="en")
        try:
            learner = await create_learner(data=data, session=session)
            print("Route handler Success:", learner.id)
        except Exception as e:
            print("Route handler Exception:", type(e), str(e))

if __name__ == "__main__":
    asyncio.run(main())
