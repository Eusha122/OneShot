from typing import List
from fastapi import APIRouter

from app.schemas.rag import RAGQueryRequest, RAGQueryResult
from app.services.rag.retriever import retriever

router = APIRouter(prefix="/api/rag", tags=["rag"])

@router.post("/query", response_model=List[RAGQueryResult])
async def query_rag(request: RAGQueryRequest):
    """
    Direct retrieval test API to validate RAG functionality, embeddings, and metadata filtering.
    """
    filters = {}
    if request.subject:
        filters["subject"] = request.subject
    if request.class_level:
        filters["class_level"] = request.class_level
        
    results = retriever.retrieve(query=request.query, filters=filters, top_k=3)
    
    response = []
    for r in results:
        response.append(RAGQueryResult(
            content=r["content"],
            score=r["score"],
            chapter=r["chapter"],
            topic=r["topic"],
            subject=r["subject"],
            page=r["page"],
            source=r["source"],
            trust_level=r["trust_level"],
            source_type=r["source_type"]
        ))
        
    return response
