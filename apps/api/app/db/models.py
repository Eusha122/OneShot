from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
import enum

from app.db.database import Base


class LearnerProfile(Base):
    __tablename__ = "learner_profiles"

    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String, nullable=True)
    grade = Column(String, nullable=True)
    board = Column(String, nullable=True)
    language_preference = Column(String, default="en")
    subjects_of_interest = Column(JSON, default=list)
    weak_topics = Column(JSON, default=list)
    performance_metrics = Column(JSON, default=dict)
    
    conversations = relationship("Conversation", back_populates="learner")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    learner_id = Column(Integer, ForeignKey("learner_profiles.id"), nullable=True)
    title = Column(String, nullable=True)
    selected_mode = Column(String, default="default")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    learner = relationship("LearnerProfile", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    memory = relationship("ConversationMemory", back_populates="conversation", uselist=False, cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    mode = Column(String, nullable=True)
    visual_blocks = Column(JSON, default=list)
    sources = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")


class ConversationMemory(Base):
    __tablename__ = "conversation_memories"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), unique=True)
    context_metadata = Column(JSON, default=dict)
    
    conversation = relationship("Conversation", back_populates="memory")


class DocumentStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    learner_id = Column(Integer, ForeignKey("learner_profiles.id"), nullable=True)
    filename = Column(String, nullable=False, unique=True)
    original_name = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.pending)
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    source_type = Column(String, nullable=True)
    trust_level = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    learner = relationship("LearnerProfile")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    chunk_index = Column(Integer, nullable=False)
    chapter = Column(String, nullable=True)
    topic = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    class_level = Column(String, nullable=True)
    page_number = Column(Integer, nullable=True)
    content_preview = Column(Text, nullable=True)
    embedding_id = Column(String, nullable=True)
    trust_level = Column(String, nullable=True)
    source_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("Document", back_populates="chunks")
