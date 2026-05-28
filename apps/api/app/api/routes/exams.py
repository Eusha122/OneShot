from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import logging
import uuid
from typing import Optional, List

from app.services.ai.exam_generator import exam_generator
from app.services.ai.searxng_adapter import searxng_adapter
from app.services.rag.retriever import retriever
from app.db.database import get_db_session
from app.api.deps import AsyncSessionDep

router = APIRouter()
logger = logging.getLogger(__name__)

class ExamRequest(BaseModel):
    subject: str
    topic: str
    count: int = 5
    type: str = "mcq"
    learner_id: Optional[int] = None
    # Profile fields sent directly from frontend
    board: str = "SSC"
    class_name: str = "Class 9"
    weak_topics: List[str] = []

@router.post("/generate")
async def generate_exam(req: ExamRequest):
    logger.info(f"[ExamRoute] Generating exam: {req.board} {req.class_name} {req.subject} - {req.topic} ({req.type} x{req.count})")

    # ── 1. Build curriculum-aware RAG query ──────────────────────────
    subject_lower = req.subject.lower().strip()
    if req.topic.strip().lower() == "full book" or not req.topic.strip():
        rag_query = f"{req.subject} {req.class_name} problems exercises"
    else:
        rag_query = f"{req.subject} {req.topic}"

    rag_context = ""
    try:
        # Pass subject as explicit filter so retriever only pulls matching chunks
        context_docs = retriever.retrieve(
            rag_query,
            filters={"subject": subject_lower},
            top_k=3
        )
        # Only use chunks that have meaningful content (not just preface/title pages)
        meaningful_chunks = [
            doc["content"] for doc in context_docs
            if len(doc["content"].strip()) > 80
        ]
        rag_context = "\n\n".join(meaningful_chunks)
    except Exception as e:
        logger.warning(f"[ExamRoute] RAG retrieval failed: {e}")

    # ── 2. Curriculum-aware Web Enrichment ───────────────────────────
    web_context = ""
    try:
        # Inject board + class into search for curriculum-relevant results
        web_query = f"{req.board} {req.class_name} {req.subject}"
        if req.topic.strip().lower() != "full book" and req.topic.strip():
            web_query += f" {req.topic}"
        web_query += " exam questions problems"

        web_context = await searxng_adapter.search(web_query, num_results=2)
    except Exception as e:
        logger.warning(f"[ExamRoute] SearxNG enrichment failed, continuing with RAG only: {e}")

    # ── 3. Intelligent Merge & Context Capping ───────────────────────
    final_context_parts = []
    if rag_context:
        final_context_parts.append("=== CURRICULUM TEXTBOOK CONTEXT ===\n" + rag_context[:1200])

    if web_context:
        final_context_parts.append("=== WEB ENRICHMENT ===\n" + web_context[:500])

    final_context = "\n\n".join(final_context_parts)

    # ── 4. Generate Exam via Ollama with profile injection ───────────
    try:
        questions = await exam_generator.generate_exam(
            subject=req.subject,
            topic=req.topic,
            count=req.count,
            q_type=req.type,
            context=final_context,
            board=req.board,
            class_name=req.class_name,
            weak_topics=req.weak_topics if req.weak_topics else None,
        )

        # Ensure IDs are unique and type/source is injected
        for q in questions:
            if "id" not in q or q["id"] == "unique-string-id":
                q["id"] = str(uuid.uuid4())
            q["type"] = req.type
            if "source" not in q:
                q["source"] = "rag" if rag_context else "web_enriched"

        return questions
    except Exception as e:
        logger.error(f"Failed to generate exam questions: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate exam questions.")

class EvaluationRequest(BaseModel):
    expected_answer: str
    student_answer: str
    question_type: str = "conceptual"

@router.post("/evaluate")
async def evaluate_answer(req: EvaluationRequest):
    from app.services.ai.answer_evaluator import answer_evaluator
    try:
        result = await answer_evaluator.evaluate_answer(req.expected_answer, req.student_answer, req.question_type)
        return result
    except Exception as e:
        logger.error(f"Failed to evaluate answer: {e}")
        raise HTTPException(status_code=500, detail="Failed to evaluate answer.")

class ExamResultQuestion(BaseModel):
    id: str
    chapter: str
    type: str
    correct: bool

class SubmitExamRequest(BaseModel):
    learner_id: int
    subject: str
    questions: List[ExamResultQuestion]

@router.post("/submit")
async def submit_exam(req: SubmitExamRequest, session: AsyncSessionDep):
    from app.db.models import LearnerProfile
    from datetime import datetime
    from sqlalchemy.future import select

    result = await session.execute(select(LearnerProfile).filter(LearnerProfile.id == req.learner_id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Learner not found")

    # Initialize metrics if missing
    if not profile.performance_metrics:
        profile.performance_metrics = {
            "exams_completed": 0,
            "questions_solved": 0,
            "streak": 0,
            "last_active": None,
            "chapters": {},
            "history": [] # list of dicts with date, subject, score
        }
    
    metrics = profile.performance_metrics

    # Calculate exam stats
    total_q = len(req.questions)
    correct_q = sum(1 for q in req.questions if q.correct)
    score = (correct_q / total_q * 100) if total_q > 0 else 0

    metrics["exams_completed"] = metrics.get("exams_completed", 0) + 1
    metrics["questions_solved"] = metrics.get("questions_solved", 0) + total_q
    
    # Update streak
    now_str = datetime.utcnow().strftime("%Y-%m-%d")
    last_active = metrics.get("last_active")
    if last_active != now_str:
        metrics["streak"] = metrics.get("streak", 0) + 1
        metrics["last_active"] = now_str

    # Log history
    metrics.setdefault("history", []).append({
        "date": datetime.utcnow().isoformat(),
        "subject": req.subject,
        "score": score
    })

    # Keep history to last 50
    metrics["history"] = metrics["history"][-50:]

    # Update chapter accuracy
    chapters = metrics.setdefault("chapters", {})
    for q in req.questions:
        # Fallback chapter if empty
        chap = q.chapter.strip() if q.chapter and q.chapter.strip() else req.subject
        if chap not in chapters:
            chapters[chap] = {"total": 0, "correct": 0}
        chapters[chap]["total"] += 1
        if q.correct:
            chapters[chap]["correct"] += 1

    # Recalculate weak topics (accuracy < 60% with at least 2 questions)
    weak_topics = []
    for chap, stats in chapters.items():
        if stats["total"] >= 2:
            acc = stats["correct"] / stats["total"]
            if acc < 0.6:
                weak_topics.append(chap)
    
    profile.weak_topics = weak_topics
    
    # Needs to be re-assigned for JSON column to trigger SQLAlchemy update
    profile.performance_metrics = metrics
    await session.commit()
    
    return {"status": "success", "score": score, "weak_topics": weak_topics}
