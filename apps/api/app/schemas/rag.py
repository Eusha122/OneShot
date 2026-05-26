from pydantic import BaseModel
from typing import Optional, List

class RAGQueryRequest(BaseModel):
    query: str
    subject: Optional[str] = None
    class_level: Optional[str] = None

class RAGQueryResult(BaseModel):
    content: str
    preview_content: str
    score: float
    chapter: str
    topic: str
    subject: str
    page: int
    source: str
    trust_level: str
    source_type: str
    chunk_id: str
    document_id: Optional[int] = None
