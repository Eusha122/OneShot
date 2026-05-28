from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import logging
import uuid
from typing import Optional

from app.services.ai.exam_generator import exam_generator
from app.services.ai.searxng_adapter import searxng_adapter
from app.services.rag.retriever import retriever

router = APIRouter()
logger = logging.getLogger(__name__)

class ExamRequest(BaseModel):
    subject: str
    topic: str
    count: int = 5
    type: str = "mcq"
    learner_id: Optional[int] = None

@router.post("/generate")
async def generate_exam(req: ExamRequest):
    logger.info(f"Generating exam for {req.subject} - {req.topic}")
    
    # 1. Attempt RAG first
    if req.topic.strip().lower() == "full book" or not req.topic.strip():
        rag_query = f"{req.subject} core concepts fundamental principles syllabus topics"
    else:
        rag_query = f"{req.subject} {req.topic}"
        
    rag_context = ""
    try:
        context_docs = retriever.retrieve(rag_query, filters={}, top_k=3)
        rag_context = "\n\n".join([doc["content"] for doc in context_docs])
    except Exception as e:
        logger.warning(f"RAG retrieval failed: {e}")
        
    # 2. Web Enrichment (Always attempt to enrich, but fail gracefully)
    web_context = ""
    try:
        # SearxNG adapter inherently limits to num_results
        web_context = await searxng_adapter.search(rag_query, num_results=2)
    except Exception as e:
        logger.warning(f"SearxNG enrichment failed, continuing with RAG only: {e}")
            
    # 3. Intelligent Merge & Context Capping
    final_context_parts = []
    if rag_context:
        # Cap RAG to ~1000 chars to leave room for web and prompt
        final_context_parts.append("=== CURRICULUM CONTEXT ===\n" + rag_context[:1000])
        
    if web_context:
        # Cap Web to ~500 chars
        final_context_parts.append("=== WEB ENRICHMENT ===\n" + web_context[:500])
        
    final_context = "\n\n".join(final_context_parts)
    
    # 4. Generate Exam via Ollama
    try:
        questions = await exam_generator.generate_exam(
            subject=req.subject,
            topic=req.topic,
            count=req.count,
            q_type=req.type,
            context=final_context
        )
        
        # Ensure IDs are unique
        for q in questions:
            if "id" not in q or q["id"] == "unique-string-id":
                q["id"] = str(uuid.uuid4())
                
        return questions
    except Exception as e:
        logger.error(f"Failed to generate exam questions: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate exam questions.")

class EvaluationRequest(BaseModel):
    expected_answer: str
    student_answer: str

@router.post("/evaluate")
async def evaluate_answer(req: EvaluationRequest):
    from app.services.ai.answer_evaluator import answer_evaluator
    try:
        result = await answer_evaluator.evaluate_answer(req.expected_answer, req.student_answer)
        return result
    except Exception as e:
        logger.error(f"Failed to evaluate answer: {e}")
        raise HTTPException(status_code=500, detail="Failed to evaluate answer.")
