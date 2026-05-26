from fastapi import APIRouter, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AsyncSessionDep
from app.db.repositories import LearnerRepository
from app.schemas.domain import LearnerProfileCreate, LearnerProfileResponse

router = APIRouter()

@router.post("/", response_model=LearnerProfileResponse)
async def create_learner(
    data: LearnerProfileCreate,
    session: AsyncSessionDep
):
    repo = LearnerRepository(session)
    learner = await repo.create(data)
    await session.commit()
    return learner

@router.get("/{learner_id}", response_model=LearnerProfileResponse)
async def get_learner(
    learner_id: int,
    session: AsyncSessionDep
):
    repo = LearnerRepository(session)
    learner = await repo.get(learner_id)
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found")
    return learner
