import uuid
import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import AsyncSessionDep
from app.core.storage import UPLOADS_DIR
from app.db.models import Document, DocumentStatus
from app.schemas.document import DocumentResponse, DocumentStatusResponse
from app.workers.ingest import process_document_task

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    session: AsyncSessionDep,
    file: UploadFile = File(...),
    source_type: Optional[str] = Form("uploaded_notes"),
    trust_level: Optional[str] = Form("variable"),
    learner_id: Optional[int] = Form(None)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    # Ensure UUID-safe filename without traversal risks
    safe_filename = os.path.basename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{safe_filename}"
    file_path = UPLOADS_DIR / unique_filename
    
    # Ensure upload directory exists before save
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Saving uploaded file to {file_path}...")
    
    # Save file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    logger.info(f"Upload saved successfully: {file_path}")
        
    # Create DB record
    doc = Document(
        learner_id=learner_id,
        filename=unique_filename,
        original_name=file.filename,
        mime_type=file.content_type,
        status=DocumentStatus.pending,
        source_type=source_type,
        trust_level=trust_level
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    
    # Trigger background task
    background_tasks.add_task(process_document_task, doc.id, str(file_path))
    
    return {"document_id": doc.id, "status": doc.status}


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(document_id: int, session: AsyncSessionDep):
    doc = await session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return DocumentStatusResponse(document_id=doc.id, status=doc.status)


@router.get("", response_model=List[DocumentResponse])
async def list_documents(session: AsyncSessionDep):
    result = await session.execute(select(Document).order_by(Document.created_at.desc()))
    docs = result.scalars().all()
    return docs
