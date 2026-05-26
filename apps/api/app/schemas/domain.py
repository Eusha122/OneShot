from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class LearnerProfileBase(BaseModel):
    display_name: Optional[str] = None
    grade: Optional[str] = None
    board: Optional[str] = None
    language_preference: str = "en"
    subjects_of_interest: List[str] = Field(default_factory=list)
    weak_topics: List[str] = Field(default_factory=list)
    performance_metrics: Dict[str, Any] = Field(default_factory=dict)


class LearnerProfileCreate(LearnerProfileBase):
    pass


class LearnerProfileResponse(LearnerProfileBase):
    id: int

    class Config:
        from_attributes = True


class MessageBase(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    mode: Optional[str] = None
    visual_blocks: List[Dict[str, Any]] = Field(default_factory=list)
    sources: List[Dict[str, Any]] = Field(default_factory=list)


class MessageCreate(MessageBase):
    conversation_id: int


class MessageResponse(MessageBase):
    id: int
    conversation_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationBase(BaseModel):
    title: Optional[str] = "New Conversation"
    selected_mode: str = "default"


class ConversationCreate(ConversationBase):
    learner_id: Optional[int] = None


class ConversationResponse(ConversationBase):
    id: int
    learner_id: Optional[int]
    created_at: datetime
    messages: List[MessageResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True
