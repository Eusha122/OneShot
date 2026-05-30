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
    request_id: Optional[str] = None

@router.post("/generate")
async def generate_exam(req: ExamRequest):
    request_id = req.request_id or uuid.uuid4().hex[:8]
    logger.info(f"[EXAM_GENERATE][{request_id}] Generating exam: {req.board} {req.class_name} {req.subject} - {req.topic} ({req.type} x{req.count})")

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
        logger.warning(f"[EXAM_GENERATE][{request_id}] RAG retrieval failed: {e}")

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
        logger.warning(f"[EXAM_GENERATE][{request_id}] SearxNG enrichment failed, continuing with RAG only: {e}")

    # ── 3. Intelligent Merge & Context Capping ───────────────────────
    final_context_parts = []
    if rag_context:
        final_context_parts.append("=== CURRICULUM TEXTBOOK CONTEXT ===\n" + rag_context[:1200])

    if web_context:
        final_context_parts.append("=== WEB ENRICHMENT ===\n" + web_context[:500])

    final_context = "\n\n".join(final_context_parts)

    # ── 4. Generate Exam via Ollama with profile injection ───────────
    from app.services.ai.ollama_client import InfrastructureError
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

        logger.info(f"[EXAM_GENERATE][{request_id}] Successfully generated {len(questions)} questions")
        return questions
    except InfrastructureError as e:
        logger.error(f"[EXAM_GENERATE][{request_id}] Infrastructure failure: {e}")
        raise HTTPException(status_code=503, detail="Local AI inference temporarily unavailable. Please retry in a moment.")
    except Exception as e:
        logger.error(f"[EXAM_GENERATE][{request_id}] Failed to generate exam questions: {e}")
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
    question_id: str
    question: str
    subject: str
    difficulty: str = "medium"
    user_answer: str
    correct_answer: str
    is_correct: bool
    skipped: bool

class SubmitExamRequest(BaseModel):
    schema_version: int = 0
    request_id: Optional[str] = None
    learner_id: int
    subject: str
    questions: List[ExamResultQuestion]

@router.post("/submit")
async def submit_exam(req: SubmitExamRequest, session: AsyncSessionDep):
    from app.db.models import LearnerProfile
    from datetime import datetime
    from sqlalchemy.future import select

    import time
    import json
    start_time = time.time()
    
    request_id = req.request_id or uuid.uuid4().hex[:8]
    
    # Structured observability baseline
    obs_log = {
        "event": "exam_evaluation_started",
        "request_id": request_id,
        "subject": req.subject,
        "question_count": len(req.questions),
        "schema_version": req.schema_version,
    }
    logger.info(json.dumps(obs_log))
    
    if req.schema_version != 1:
        obs_log.update({"event": "exam_evaluation_failed", "error_type": "schema_mismatch", "status": 426, "latency_ms": round((time.time() - start_time)*1000)})
        logger.warning(json.dumps(obs_log))
        raise HTTPException(status_code=426, detail="Upgrade required. Client schema mismatch.")
        
    if len(req.questions) == 0:
        obs_log.update({"event": "exam_evaluation_failed", "error_type": "empty_payload", "status": 400, "latency_ms": round((time.time() - start_time)*1000)})
        logger.error(json.dumps(obs_log))
        raise HTTPException(status_code=400, detail="No submitted questions received")

    VALID_SUBJECTS = {"physics", "chemistry", "biology", "mathematics", "ict", "general"}
    if req.subject.lower() not in VALID_SUBJECTS:
        obs_log.update({"event": "exam_evaluation_failed", "error_type": "invalid_subject", "status": 400, "latency_ms": round((time.time() - start_time)*1000)})
        logger.error(json.dumps(obs_log))
        raise HTTPException(status_code=400, detail="Invalid subject")

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

    # Calculate exam stats with robust corrupted payload handling
    total_q = len(req.questions)
    correct_q = 0
    
    for idx, q in enumerate(req.questions):
        if not q.question_id or not q.question:
            logger.warning(f"[EXAM_SUBMIT][{request_id}] Malformed question at index {idx}, defaulting to incorrect")
            q.is_correct = False
            q.skipped = True
        
        if q.is_correct:
            correct_q += 1

    score = (correct_q / total_q * 100) if total_q > 0 else 0
    logger.info(f"[EXAM_SUBMIT][{request_id}] processed score={score}% ({correct_q}/{total_q})")

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
        chap = q.subject.strip() if q.subject and q.subject.strip() else req.subject
        if chap not in chapters:
            chapters[chap] = {"total": 0, "correct": 0}
        chapters[chap]["total"] += 1
        if q.is_correct:
            chapters[chap]["correct"] += 1

    # Recalculate weak/mastery topics
    weak_topics = []
    mastery_topics = []
    for chap, stats in chapters.items():
        if stats["total"] >= 2:
            acc = stats["correct"] / stats["total"]
            if acc < 0.6:
                weak_topics.append(chap)
            elif acc >= 0.8:
                mastery_topics.append(chap)
    
    profile.weak_topics = weak_topics
    
    # Needs to be re-assigned for JSON column to trigger SQLAlchemy update
    profile.performance_metrics = metrics
    await session.commit()
    
    obs_log.update({
        "event": "exam_evaluation_completed",
        "status": 200,
        "score": score,
        "latency_ms": round((time.time() - start_time)*1000)
    })
    logger.info(json.dumps(obs_log))
    
    return {"status": "success", "score": score, "weak_topics": weak_topics, "mastery_topics": mastery_topics}
