from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    status: str
    page_count: int
    chunk_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class DocumentStatusResponse(BaseModel):
    document_id: int
    status: str
