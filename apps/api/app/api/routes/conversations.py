from typing import List

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AsyncSessionDep
from app.db.repositories import ConversationRepository
from app.schemas.domain import ConversationCreate, ConversationResponse

router = APIRouter()

@router.post("/", response_model=ConversationResponse)
async def create_conversation(
    data: ConversationCreate,
    session: AsyncSessionDep
):
    repo = ConversationRepository(session)
    conversation = await repo.create(data)
    await session.commit()
    return conversation

@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    session: AsyncSessionDep,
    learner_id: int = Query(..., description="The ID of the learner")
):
    repo = ConversationRepository(session)
    return await repo.list_by_learner(learner_id)

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    session: AsyncSessionDep
):
    repo = ConversationRepository(session)
    conversation = await repo.get(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation
