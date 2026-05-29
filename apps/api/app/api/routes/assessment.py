import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import json
import asyncio

from app.services.ai.image_assessment import image_assessment
from app.db.models import LearnerProfile
from app.api.deps import AsyncSessionDep
from sqlalchemy.future import select

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assessment", tags=["assessment"])

@router.post("/upload-answer")
async def upload_answer(
    session: AsyncSessionDep,
    image: UploadFile = File(...),
    question_id: Optional[str] = Form(None),
    learner_id: Optional[int] = Form(1)
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only images are allowed.")
    
    # 5MB Hard Limit
    file_bytes = await image.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")

    async def event_stream():
        try:
            # Yield padding to bypass strict proxy buffering
            yield f": {' ' * 2048}\n\n"
            
            # STAGE 1: Reading Handwriting
            yield f"data: {json.dumps({'stage': 'reading', 'message': '🧠 Reading handwriting...'})}\n\n"
            await asyncio.sleep(0.1) # Yield to event loop
            
            compressed_bytes = await image_assessment.compress_image(file_bytes)
            
            # We will run the pipeline steps manually to stream the events
            import uuid, os
            from app.core.storage import UPLOADS_DIR
            from app.services.ai.gemini_vision import gemini_vision_service
            
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            temp_path = UPLOADS_DIR / f"temp_{uuid.uuid4()}.jpg"
            with open(temp_path, "wb") as f:
                f.write(compressed_bytes)
                
            try:
                extracted_text = await gemini_vision_service.extract_text_from_image(str(temp_path))
                yield f"data: {json.dumps({'stage': 'extracted', 'message': '✓ Handwriting extracted', 'text': extracted_text})}\n\n"
                
                # STAGE 2: Identifying Topic
                yield f"data: {json.dumps({'stage': 'identifying', 'message': '📘 Identifying topic...'})}\n\n"
                subject_info = await gemini_vision_service.detect_subject_from_image(str(temp_path))
                topic = subject_info.get("topic", "Unknown")
                
                # STAGE 3: Checking Correctness
                yield f"data: {json.dumps({'stage': 'evaluating', 'message': '✅ Checking correctness...'})}\n\n"
                feedback = await gemini_vision_service.assess_student_answer(
                    question=f"Student uploaded work regarding {topic}",
                    expected_answer="Provide full evaluation and feedback",
                    image_path=str(temp_path)
                )
                
                # STAGE 4: Finding Weak Concepts
                yield f"data: {json.dumps({'stage': 'weak_topics', 'message': '🎯 Finding weak concepts...'})}\n\n"
                
                is_correct = "mistake" not in feedback.lower() and "incorrect" not in feedback.lower()
                weak_topics = [topic] if not is_correct and topic != "Unknown" else []
                
                # Update Learner Profile
                if weak_topics and learner_id:
                    result = await session.execute(select(LearnerProfile).filter(LearnerProfile.id == learner_id))
                    profile = result.scalars().first()
                    if profile:
                        current_weak = profile.weak_topics or []
                        for wt in weak_topics:
                            if wt not in current_weak:
                                current_weak.append(wt)
                        profile.weak_topics = current_weak
                        await session.commit()
                
                final_payload = {
                    "stage": "complete",
                    "correct": is_correct,
                    "score": 0.85 if is_correct else 0.5,
                    "partial_credit": 0.5 if not is_correct else 1.0,
                    "confidence": 0.95,
                    "feedback": feedback,
                    "mistakes": ["Refer to feedback"] if not is_correct else [],
                    "weak_topics": weak_topics,
                    "extracted_text": extracted_text,
                    "subject_info": subject_info
                }
                
                yield f"data: {json.dumps(final_payload)}\n\n"
                
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
        except Exception as e:
            logger.error(f"Image assessment failed: {e}")
            error_str = str(e)
            if "Gemini API key missing" in error_str or "API key not valid" in error_str or "API_KEY_INVALID" in error_str:
                error_msg = "Gemini API key is missing or invalid. Please check your .env file, ensure there are no spaces or quotes, and try generating a new key from Google AI Studio if the issue persists."
            else:
                error_msg = "Could not analyze handwriting clearly. Try brighter lighting."
            yield f"data: {json.dumps({'stage': 'error', 'message': error_msg})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
