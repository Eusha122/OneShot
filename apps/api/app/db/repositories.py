from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Conversation, LearnerProfile, Message
from app.schemas.domain import ConversationCreate, LearnerProfileCreate, MessageCreate


class LearnerRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: LearnerProfileCreate) -> LearnerProfile:
        learner = LearnerProfile(**data.model_dump())
        self.session.add(learner)
        await self.session.flush()
        await self.session.refresh(learner)
        return learner

    async def get(self, learner_id: int) -> Optional[LearnerProfile]:
        query = select(LearnerProfile).where(LearnerProfile.id == learner_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()


class ConversationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: ConversationCreate) -> Conversation:
        conversation = Conversation(**data.model_dump())
        self.session.add(conversation)
        await self.session.flush()
        # Fetch with eager loaded relationships
        return await self.get(conversation.id)

    async def get(self, conversation_id: int) -> Optional[Conversation]:
        query = select(Conversation).options(
            selectinload(Conversation.messages)
        ).where(Conversation.id == conversation_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_by_learner(self, learner_id: int) -> List[Conversation]:
        query = select(Conversation).options(
            selectinload(Conversation.messages)
        ).where(
            Conversation.learner_id == learner_id
        ).order_by(Conversation.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())


class MessageRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: MessageCreate) -> Message:
        message = Message(**data.model_dump())
        self.session.add(message)
        await self.session.flush()
        await self.session.refresh(message)
        return message
