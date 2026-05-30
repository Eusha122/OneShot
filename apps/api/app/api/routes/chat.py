import logging

import httpx
import json
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AsyncSessionDep
from app.core.config import settings
from app.db.models import Document
from app.db.repositories import MessageRepository
from sqlalchemy import select
from app.schemas.chat import ChatRequest, ChatResponse, ExamTransitionRequest
from app.schemas.domain import MessageCreate
from app.services.ai.ai_router import ai_router, InfrastructureError, InferenceError
from app.services.ai.prompt_policy import build_tutor_prompt
from app.services.ai.visual_blocks import infer_visual_blocks
from app.services.rag.retriever import retriever
from app.services.exams.exam_summary_builder import build_educational_summary, build_hidden_system_context

logger = logging.getLogger(__name__)

import re

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("/exam_transition")
async def stream_exam_transition(
    request: ExamTransitionRequest,
    session: AsyncSessionDep
) -> StreamingResponse:
    adapter = ai_router
    
    req_id = request.request_id or "unknown"
    
    # 1. Build the educational summary
    summary_data = build_educational_summary(request.exam_results, request_id=req_id)
    
    # 2. Build the hidden system context
    system_context = build_hidden_system_context(summary_data)
    
    # 3. Add to visual blocks
    visual_blocks = [{
        "id": "exam-summary",
        "type": "exam_summary",
        "params": summary_data
    }]

    async def event_stream():
        # Yield padding to bypass Windows AV/TCP strict SSE buffering
        yield f": {' ' * 2048}\n\n"
        
        yield f"data: {json.dumps({'type': 'meta', 'model': settings.ollama_model, 'visual_blocks': visual_blocks})}\n\n"
        
        # Build prompt
        system_prompt, _ = build_tutor_prompt(
            "User just finished an exam.", 
            request.learning_mode, 
            context="",
            active_document_filenames=[]
        )
        
        # Inject our hidden RECENT_EXAM_CONTEXT
        system_prompt += f"\n\n{system_context}"
        
        # The user's actual prompt is implicit (we simulate them saying 'I just finished the exam')
        user_prompt = "I just finished the assessment. Can you give me some feedback and help me improve?"
        
        full_content = ""
        try:
            async for chunk in adapter.stream(user_prompt, request.history, system_prompt=system_prompt, temperature=0.7):
                try:
                    parsed_chunk = json.loads(chunk)
                    text = parsed_chunk.get("response", "")
                    if text:
                        full_content += text
                        payload = json.dumps({"type": "chunk", "text": text})
                        yield f"data: {payload}\n\n"
                except Exception:
                    pass

            # Persist both messages once streaming is complete
            if request.conversation_id and full_content:
                repo = MessageRepository(session)
                try:
                    await repo.create(MessageCreate(
                        conversation_id=request.conversation_id,
                        role="user",
                        content="I just finished the assessment. Can you give me some feedback and help me improve?",
                        mode=request.learning_mode
                    ))
                    await repo.create(MessageCreate(
                        conversation_id=request.conversation_id,
                        role="assistant",
                        content=full_content,
                        visual_blocks=visual_blocks,
                        mode=request.learning_mode
                    ))
                    await session.commit()
                except Exception:
                    await session.rollback()
                    logger.exception(
                        "Failed to persist exam transition messages for conversation_id=%s",
                        request.conversation_id,
                    )

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Error in stream_exam_transition generation: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

def _is_simple_greeting(message: str) -> bool:
    """Lightweight heuristic to bypass RAG for casual chat."""
    msg = message.strip().lower()
    # Simple exact matches or short conversational phrases
    if msg in ["hi", "hello", "thanks", "thank you", "how are you", "ok", "okay"]:
        return True
    # If the message is very short and doesn't contain question words, it might be chat
    if len(msg.split()) < 3 and not any(w in msg for w in ["what", "how", "why", "explain", "define"]):
        return True
    return False


@router.post("/message", response_model=ChatResponse)
async def create_chat_message(
    request: ChatRequest,
    session: AsyncSessionDep
) -> ChatResponse:
    adapter = ai_router
    
    # Retrieve context if not a simple greeting
    context_text = ""
    rag_results = []
    active_filenames = []
    
    from app.services.ai.subject_detector import detect_subject
    resolved_subject = request.subject
    if not resolved_subject or resolved_subject == "auto":
        resolved_subject = detect_subject(request.message)
    
    if request.active_document_ids:
        logger.info(f"[CHAT] active_document_ids={request.active_document_ids}")
        try:
            result = await session.execute(select(Document).where(Document.id.in_(request.active_document_ids)))
            docs = result.scalars().all()
            active_filenames = [doc.filename for doc in docs]
        except Exception as e:
            logger.error(f"Failed to fetch active document filenames: {e}")
    
    if not _is_simple_greeting(request.message):
        filters = {}
        if request.active_document_ids:
            filters["document_ids"] = request.active_document_ids
        if resolved_subject != "general":
            filters["subject"] = resolved_subject
            
        # Optimize top_k based on subject filter
        top_k = 3 if resolved_subject != "general" else 2

        rag_results = retriever.retrieve(query=request.message, filters=filters, top_k=top_k)
        context_text = "\n\n".join([f"Source: {r['source']} (Page {r['page']})\n{r['content'][:600]}{'...' if len(r['content']) > 600 else ''}" for r in rag_results])
        
        sources = list(set(r['source'] for r in rag_results))
        logger.info(f'[RAG] query="{request.message}" chunks_found={len(rag_results)} sources={sources}')
    
    system_prompt, user_prompt = build_tutor_prompt(
        request.message, 
        request.learning_mode, 
        context=context_text,
        active_document_filenames=active_filenames,
        subject=resolved_subject
    )

    try:
        content = await adapter.generate(user_prompt, request.history, system_prompt=system_prompt, temperature=0.2)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama returned {exc.response.status_code}") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Ollama is not reachable at the configured URL") from exc

    visual_blocks = infer_visual_blocks(request.message)
    
    if not visual_blocks:
        from app.services.ai.concept_detector import detect_concept
        from app.schemas.chat import VisualBlock
        
        concept = await detect_concept(request.message, context_text)
        if concept and concept["confidence"] > 0.7:
            logger.info(f'[VISUAL] concept_detected={concept["concept_id"]} confidence={concept["confidence"]}')
            cid = concept["concept_id"]
            
            mapping = {
                "triangle_angle_sum": ("geometry.triangle", {}),
                "supplementary_angles": ("geometry.triangle", {}),
                "circle_geometry": ("geometry.circle", {}),
                "pythagorean_theorem": ("geometry.triangle", {}),
                "linear_equation": ("math.linearGraph", {}),
                "graph_function": ("math.quadraticGraph", {}),
                "trigonometry_basic": ("math.sineGraph", {}),
                
                "newton_second_law": ("physics.forceMotion", {}),
                "force_motion": ("physics.forceMotion", {}),
                "speed_velocity_acceleration": ("physics.engineLab", {"scenario": "kinematics"}),
                "projectile_motion": ("physics.projectile", {}),
                "quadratic_equation": ("math.quadraticGraph", {}),
                "waves": ("physics.engineLab", {"scenario": "waves"}),
                "optics": ("physics.engineLab", {"scenario": "optics"}),
                "optics_reflection": ("physics.engineLab", {"scenario": "optics"}),
                "electricity": ("physics.engineLab", {"scenario": "electricity"}),
                "electricity_current": ("physics.engineLab", {"scenario": "electricity"}),
                "energy": ("physics.engineLab", {"scenario": "energy"}),
                "pressure": ("physics.engineLab", {"scenario": "pressure"}),
                "sine_cosine": ("math.sineGraph", {}),
                "kinematics": ("physics.engineLab", {"scenario": "kinematics"}),
                "momentum": ("physics.engineLab", {"scenario": "force"})
            }
            
            if cid in mapping:
                vtype, vparams = mapping[cid]
                visual_blocks.append(
                    VisualBlock(
                        id=f"rag-visual-{cid}",
                        type=vtype,
                        params=vparams
                    )
                )

    if request.conversation_id:
        repo = MessageRepository(session)
        try:
            await repo.create(MessageCreate(
                conversation_id=request.conversation_id,
                role="user",
                content=request.message,
                mode=request.learning_mode
            ))
            await repo.create(MessageCreate(
                conversation_id=request.conversation_id,
                role="assistant",
                content=content,
                visual_blocks=[vb.model_dump() for vb in visual_blocks],
                mode=request.learning_mode
            ))
            await session.commit()
        except Exception:
            await session.rollback()
            logger.exception(
                "Failed to persist messages for conversation_id=%s",
                request.conversation_id,
            )
            raise

    return ChatResponse(
        content=content,
        visual_blocks=visual_blocks,
        model=settings.ollama_model,
        resolved_subject=resolved_subject
    )

from app.schemas.chat import VisualizeRequest, VisualBlock
from app.services.ai.concept_detector import detect_concept

@router.post("/visualize", response_model=VisualBlock)
async def generate_visualization(request: VisualizeRequest):
    logger.info(f"[VISUALIZATION] Request: query='{request.query[:80]}'")
    
    try:
        concept = await detect_concept(request.query, request.context)
    except Exception as e:
        logger.error(f"[VISUALIZATION ERROR] Concept detection failed: {e}")
        raise HTTPException(status_code=500, detail="Concept detection failed")
    
    if not concept:
        logger.info("[VISUALIZATION] No concept detected")
        raise HTTPException(status_code=404, detail="Could not identify a visualizable concept")
        
    cid = concept["concept_id"]
    logger.info(f"[VISUALIZATION] Concept detected: {cid} (confidence={concept.get('confidence', '?')})")
    
    mapping = {
        "triangle_angle_sum": ("geometry.triangle", {}),
        "supplementary_angles": ("geometry.triangle", {}),
        "circle_geometry": ("geometry.circle", {}),
        "pythagorean_theorem": ("geometry.triangle", {}),
        "linear_equation": ("math.linearGraph", {}),
        "graph_function": ("math.quadraticGraph", {}),
        "trigonometry_basic": ("math.sineGraph", {}),
        
        "newton_second_law": ("physics.forceMotion", {}),
        "force_motion": ("physics.forceMotion", {}),
        "speed_velocity_acceleration": ("physics.engineLab", {"scenario": "kinematics"}),
        "projectile_motion": ("physics.projectile", {}),
        "quadratic_equation": ("math.quadraticGraph", {}),
        "waves": ("physics.engineLab", {"scenario": "waves"}),
        "optics": ("physics.engineLab", {"scenario": "optics"}),
        "optics_reflection": ("physics.engineLab", {"scenario": "optics"}),
        "electricity": ("physics.engineLab", {"scenario": "electricity"}),
        "electricity_current": ("physics.engineLab", {"scenario": "electricity"}),
        "energy": ("physics.engineLab", {"scenario": "energy"}),
        "pressure": ("physics.engineLab", {"scenario": "pressure"}),
        "sine_cosine": ("math.sineGraph", {}),
        "kinematics": ("physics.engineLab", {"scenario": "kinematics"}),
        "momentum": ("physics.engineLab", {"scenario": "force"})
    }
    
    if cid not in mapping:
        logger.warning(f"[VISUALIZATION ERROR] Unsupported concept: {cid}")
        raise HTTPException(status_code=404, detail=f"Concept {cid} is not visualizable yet")
        
    vtype, vparams = mapping[cid]
    if "extracted_params" in concept and isinstance(concept["extracted_params"], dict):
        vparams.update(concept["extracted_params"])
    
    logger.info(f"[VISUALIZATION] Block generated: type={vtype} params={vparams}")
        
    return VisualBlock(
        id=f"rag-visual-{cid}",
        type=vtype,
        params=vparams
    )


@router.post("/stream")
async def stream_chat_message(
    request: ChatRequest,
    session: AsyncSessionDep
) -> StreamingResponse:
    adapter = ai_router
    visual_blocks = [block.model_dump() for block in infer_visual_blocks(request.message)]
    
    logger.info(f"Stream request received with active_document_ids: {request.active_document_ids}")

    async def event_stream():
        # Yield padding to bypass Windows AV/TCP strict SSE buffering
        yield f": {' ' * 2048}\n\n"
        
        yield f"data: {json.dumps({'type': 'meta', 'model': settings.ollama_model, 'visual_blocks': visual_blocks})}\n\n"
        
        rag_results = []
        context_text = ""
        active_filenames = []
        
        if request.active_document_ids:
            logger.info(f"[CHAT] active_document_ids={request.active_document_ids}")
            try:
                result = await session.execute(select(Document).where(Document.id.in_(request.active_document_ids)))
                docs = result.scalars().all()
                active_filenames = [doc.filename for doc in docs]
            except Exception as e:
                logger.error(f"Failed to fetch active document filenames: {e}")
        
        import asyncio
        if not _is_simple_greeting(request.message):
            # Pipeline: Searching
            if request.active_document_ids:
                search_label = "Searching attached documents..."
            else:
                search_label = "Searching educational materials..."
            yield f"data: {json.dumps({'type': 'pipeline', 'stage': 'searching_textbook', 'label': search_label})}\n\n"
            await asyncio.sleep(0) # Flush
            
            filters = {}
            if request.active_document_ids:
                filters["document_ids"] = request.active_document_ids

            rag_results = await asyncio.to_thread(retriever.retrieve, query=request.message, filters=filters, top_k=3)
            context_text = "\n\n".join([f"Source: {r['source']} (Page {r['page']})\n{r['content'][:600]}{'...' if len(r['content']) > 600 else ''}" for r in rag_results])
            
            sources = list(set(r['source'] for r in rag_results))
            logger.info(f'[RAG] query="{request.message}" chunks_found={len(rag_results)} sources={sources}')
            
            # Optionally yield chunk citations here if needed for frontend UX
            for chunk in rag_results:
                yield f"data: {json.dumps({'type': 'citation', 'chunk_id': chunk['chunk_id'], 'source': chunk['source'], 'page': chunk['page'], 'score': chunk['score']})}\n\n"
                await asyncio.sleep(0) # Flush
        
        if not visual_blocks:
            from app.services.ai.concept_detector import detect_concept
            
            concept = await detect_concept(request.message, context_text)
            if concept and concept["confidence"] > 0.7:
                logger.info(f'[VISUAL] concept_detected={concept["concept_id"]} confidence={concept["confidence"]}')
                cid = concept["concept_id"]
                
                mapping = {
                    "newton_second_law": ("physics.forceMotion", {}),
                    "projectile_motion": ("physics.projectile", {}),
                    "quadratic_equation": ("math.quadraticGraph", {}),
                    "waves": ("physics.engineLab", {"scenario": "waves"}),
                    "optics": ("physics.engineLab", {"scenario": "optics"}),
                    "electricity": ("physics.engineLab", {"scenario": "electricity"}),
                    "energy": ("physics.engineLab", {"scenario": "energy"}),
                    "pressure": ("physics.engineLab", {"scenario": "pressure"}),
                    "sine_cosine": ("math.sineGraph", {}),
                    "kinematics": ("physics.engineLab", {"scenario": "kinematics"}),
                    "momentum": ("physics.engineLab", {"scenario": "force"})
                }
                
                if cid in mapping:
                    vtype, vparams = mapping[cid]
                    if "extracted_params" in concept and isinstance(concept["extracted_params"], dict):
                        vparams.update(concept["extracted_params"])
                        
                    visual_blocks.append({
                        "id": f"rag-visual-{cid}",
                        "type": vtype,
                        "params": vparams
                    })
                    # Re-emit meta if we added a block from RAG
                    yield f"data: {json.dumps({'type': 'meta', 'model': settings.ollama_model, 'visual_blocks': visual_blocks})}\n\n"
                    await asyncio.sleep(0) # Flush
        
        learner_profile_dict = None
        if request.conversation_id:
            from app.db.models import Conversation, LearnerProfile
            from sqlalchemy.orm import selectinload
            
            try:
                conv_result = await session.execute(
                    select(Conversation)
                    .where(Conversation.id == request.conversation_id)
                    .options(selectinload(Conversation.learner))
                )
                conv = conv_result.scalar_one_or_none()
                if conv and conv.learner:
                    learner_profile_dict = {
                        "weak_topics": conv.learner.weak_topics or [],
                        "performance_metrics": conv.learner.performance_metrics or {}
                    }
                    
                    # If this is an exam evaluation, we can log it and potentially flag for profile update
                    if "evaluate my performance" in request.message.lower() and "exam" in request.message.lower():
                        logger.info(f"[EXAM] Triggering exam evaluation mode for learner {conv.learner.id}")
            except Exception as e:
                logger.error(f"Failed to fetch learner profile: {e}")
        
        system_prompt, user_prompt = build_tutor_prompt(
            request.message, 
            request.learning_mode, 
            context=context_text,
            active_document_filenames=active_filenames,
            learner_profile=learner_profile_dict
        )
        
        # Pipeline: Generating
        yield f"data: {json.dumps({'type': 'pipeline', 'stage': 'generating_answer', 'label': 'Generating answer...'})}\n\n"
        await asyncio.sleep(0) # Flush
        
        try:
            full_response = ""
            # Simple state machine to filter out <think> blocks common in reasoning models
            is_thinking = False
            buffer_str = ""
            
            async for line in adapter.stream(user_prompt, request.history, system_prompt=system_prompt, temperature=0.2):
                payload = json.loads(line)
                content = payload.get("response", "")
                if content:
                    buffer_str += content
                    
                    if not is_thinking:
                        if "<think>" in buffer_str:
                            is_thinking = True
                            before = buffer_str.split("<think>")[0]
                            if before:
                                full_response += before
                                yield f"data: {json.dumps({'type': 'token', 'content': before})}\n\n"
                                await asyncio.sleep(0)
                            buffer_str = ""
                        elif len(buffer_str) > 10 or "\n" in buffer_str:
                            full_response += buffer_str
                            yield f"data: {json.dumps({'type': 'token', 'content': buffer_str})}\n\n"
                            await asyncio.sleep(0)
                            buffer_str = ""
                    else:
                        if "</think>" in buffer_str:
                            is_thinking = False
                            after = buffer_str.split("</think>")[-1]
                            buffer_str = after
                            if len(buffer_str) > 10 or "\n" in buffer_str:
                                full_response += buffer_str
                                yield f"data: {json.dumps({'type': 'token', 'content': buffer_str})}\n\n"
                                await asyncio.sleep(0)
                                buffer_str = ""

            if buffer_str and not is_thinking:
                full_response += buffer_str
                yield f"data: {json.dumps({'type': 'token', 'content': buffer_str})}\n\n"
                await asyncio.sleep(0)
                if payload.get("done"):
                    if request.conversation_id:
                        repo = MessageRepository(session)
                        try:
                            await repo.create(MessageCreate(
                                conversation_id=request.conversation_id,
                                role="user",
                                content=request.message,
                                mode=request.learning_mode
                            ))
                            await repo.create(MessageCreate(
                                conversation_id=request.conversation_id,
                                role="assistant",
                                content=full_response,
                                visual_blocks=visual_blocks,
                                mode=request.learning_mode
                            ))
                            await session.commit()
                        except Exception:
                            await session.rollback()
                            logger.exception(
                                "Failed to persist streamed messages for conversation_id=%s",
                                request.conversation_id,
                            )
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except httpx.HTTPStatusError as exc:
            yield f"data: {json.dumps({'type': 'error', 'content': f'Ollama returned {exc.response.status_code}'})}\n\n"
        except httpx.HTTPError:
            yield f"data: {json.dumps({'type': 'error', 'content': 'Ollama is not reachable at the configured URL'})}\n\n"

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=headers)

@router.websocket("/stream/ws")
async def websocket_chat_stream(
    websocket: WebSocket,
    session: AsyncSessionDep
):
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        request = ChatRequest(**data)
        
        adapter = ai_router
        
        from app.services.ai.subject_detector import detect_subject
        resolved_subject = request.subject
        if not resolved_subject or resolved_subject == "auto":
            resolved_subject = detect_subject(request.message)
            
        if resolved_subject != "general":
            await websocket.send_json({'type': 'context', 'message': f"⚛ {resolved_subject.capitalize()} Context Active"})
            
        visual_blocks = [block.model_dump() for block in infer_visual_blocks(request.message)]
        logger.info(f"WS Stream request received with active_document_ids: {request.active_document_ids}, subject: {resolved_subject}")
        await websocket.send_json({'type': 'meta', 'model': settings.ollama_model, 'visual_blocks': visual_blocks})
        
        rag_results = []
        context_text = ""
        active_filenames = []
        
        if request.active_document_ids:
            try:
                result = await session.execute(select(Document).where(Document.id.in_(request.active_document_ids)))
                docs = result.scalars().all()
                active_filenames = [doc.filename for doc in docs]
            except Exception as e:
                logger.error(f"Failed to fetch active document filenames: {e}")
        
        import asyncio
        if not _is_simple_greeting(request.message):
            search_label = "Searching attached documents..." if request.active_document_ids else "Searching educational materials..."
            await websocket.send_json({'type': 'pipeline', 'stage': 'searching_textbook', 'label': search_label})
            
            filters = {}
            if request.active_document_ids:
                filters["document_ids"] = request.active_document_ids
            if resolved_subject != "general":
                filters["subject"] = resolved_subject
                
            top_k = 3 if resolved_subject != "general" else 2

            rag_results = await asyncio.to_thread(retriever.retrieve, query=request.message, filters=filters, top_k=top_k)
            context_text = "\n\n".join([f"Source: {r['source']} (Page {r['page']})\n{r['content'][:600]}{'...' if len(r['content']) > 600 else ''}" for r in rag_results])
            
            for chunk in rag_results:
                await websocket.send_json({'type': 'citation', 'chunk_id': chunk['chunk_id'], 'source': chunk['source'], 'page': chunk['page'], 'score': chunk['score']})
        
        if not visual_blocks:
            from app.services.ai.concept_detector import detect_concept
            concept = await detect_concept(request.message, context_text)
            if concept and concept["confidence"] > 0.7:
                cid = concept["concept_id"]
                mapping = {
                    "triangle_angle_sum": ("geometry.triangle", {}),
                    "supplementary_angles": ("geometry.triangle", {}),
                    "circle_geometry": ("geometry.circle", {}),
                    "pythagorean_theorem": ("geometry.triangle", {}),
                    "linear_equation": ("math.linearGraph", {}),
                    "graph_function": ("math.quadraticGraph", {}),
                    "trigonometry_basic": ("math.sineGraph", {}),
                    
                    "newton_second_law": ("physics.forceMotion", {}),
                    "force_motion": ("physics.forceMotion", {}),
                    "speed_velocity_acceleration": ("physics.engineLab", {"scenario": "kinematics"}),
                    "projectile_motion": ("physics.projectile", {}),
                    "quadratic_equation": ("math.quadraticGraph", {}),
                    "waves": ("physics.engineLab", {"scenario": "waves"}),
                    "optics": ("physics.engineLab", {"scenario": "optics"}),
                    "optics_reflection": ("physics.engineLab", {"scenario": "optics"}),
                    "electricity": ("physics.engineLab", {"scenario": "electricity"}),
                    "electricity_current": ("physics.engineLab", {"scenario": "electricity"}),
                    "energy": ("physics.engineLab", {"scenario": "energy"}),
                    "pressure": ("physics.engineLab", {"scenario": "pressure"}),
                    "sine_cosine": ("math.sineGraph", {}),
                    "kinematics": ("physics.engineLab", {"scenario": "kinematics"}),
                    "momentum": ("physics.engineLab", {"scenario": "force"})
                }
                
                if cid in mapping:
                    vtype, vparams = mapping[cid]
                    if "extracted_params" in concept and isinstance(concept["extracted_params"], dict):
                        vparams.update(concept["extracted_params"])
                        
                    visual_blocks.append({"id": f"rag-visual-{cid}", "type": vtype, "params": vparams})
                    await websocket.send_json({'type': 'meta', 'model': settings.ollama_model, 'visual_blocks': visual_blocks})
        
        system_prompt, user_prompt = build_tutor_prompt(
            request.message, 
            request.learning_mode, 
            context=context_text,
            active_document_filenames=active_filenames,
            subject=resolved_subject
        )
        
        await websocket.send_json({'type': 'pipeline', 'stage': 'generating_answer', 'label': 'Generating answer...'})
        
        full_response = ""
        is_thinking = False
        buffer_str = ""
        
        async for line in adapter.stream(user_prompt, request.history, system_prompt=system_prompt, temperature=0.2):
            payload = json.loads(line)
            content = payload.get("response", "")
            if content:
                buffer_str += content
                if not is_thinking:
                    if "<think>" in buffer_str:
                        is_thinking = True
                        before = buffer_str.split("<think>")[0]
                        if before:
                            full_response += before
                            await websocket.send_json({'type': 'token', 'content': before})
                        buffer_str = ""
                    elif len(buffer_str) > 10 or "\n" in buffer_str:
                        full_response += buffer_str
                        await websocket.send_json({'type': 'token', 'content': buffer_str})
                        buffer_str = ""
                else:
                    if "</think>" in buffer_str:
                        is_thinking = False
                        after = buffer_str.split("</think>")[-1]
                        buffer_str = after
                        if len(buffer_str) > 10 or "\n" in buffer_str:
                            full_response += buffer_str
                            await websocket.send_json({'type': 'token', 'content': buffer_str})
                            buffer_str = ""
        
        if buffer_str and not is_thinking:
            full_response += buffer_str
            await websocket.send_json({'type': 'token', 'content': buffer_str})
            
        if payload.get("done"):
            if request.conversation_id:
                repo = MessageRepository(session)
                try:
                    await repo.create(MessageCreate(
                        conversation_id=request.conversation_id,
                        role="user",
                        content=request.message,
                        mode=request.learning_mode
                    ))
                    await repo.create(MessageCreate(
                        conversation_id=request.conversation_id,
                        role="assistant",
                        content=full_response,
                        visual_blocks=visual_blocks,
                        mode=request.learning_mode
                    ))
                    await session.commit()
                except Exception:
                    await session.rollback()
                    logger.exception("WS stream persist failed")
            await websocket.send_json({'type': 'done'})
            
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except httpx.HTTPStatusError as exc:
        await websocket.send_json({'type': 'error', 'content': f'Ollama returned {exc.response.status_code}'})
    except httpx.HTTPError:
        await websocket.send_json({'type': 'error', 'content': 'Ollama is not reachable'})
    except Exception as e:
        logger.exception("WS Error")
        try:
            await websocket.send_json({'type': 'error', 'content': str(e)})
        except Exception:
            pass
