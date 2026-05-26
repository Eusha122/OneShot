import logging

import httpx
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AsyncSessionDep
from app.core.config import settings
from app.db.models import Document
from app.db.repositories import MessageRepository
from sqlalchemy import select
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.domain import MessageCreate
from app.services.ai.ollama_adapter import OllamaAdapter
from app.services.ai.prompt_policy import build_tutor_prompt
from app.services.ai.visual_blocks import infer_visual_blocks
from app.services.rag.retriever import retriever

logger = logging.getLogger(__name__)

import re

router = APIRouter(prefix="/api/chat", tags=["chat"])

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
    adapter = OllamaAdapter()
    
    # Retrieve context if not a simple greeting
    context_text = ""
    rag_results = []
    active_filenames = []
    
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

        rag_results = retriever.retrieve(query=request.message, filters=filters, top_k=3)
        context_text = "\n\n".join([f"Source: {r['source']} (Page {r['page']})\n{r['content']}" for r in rag_results])
        
        sources = list(set(r['source'] for r in rag_results))
        logger.info(f'[RAG] query="{request.message}" chunks_found={len(rag_results)} sources={sources}')
    
    system_prompt, user_prompt = build_tutor_prompt(
        request.message, 
        request.learning_mode, 
        context=context_text,
        active_document_filenames=active_filenames
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
        
        concept = detect_concept(request.message, context_text)
        if concept and concept["confidence"] > 0.7:
            logger.info(f'[VISUAL] concept_detected={concept["concept_id"]} confidence={concept["confidence"]}')
            cid = concept["concept_id"]
            
            mapping = {
                "newton_second_law": ("physics.forceMotion", {}),
                "projectile_motion": ("physics.projectile", {}),
                "quadratic_equation": ("math.quadraticGraph", {}),
                "geometry_triangle": ("math.triangleGeometry", {}),
                "probability": ("math.probabilitySim", {}),
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
    )


@router.post("/stream")
async def stream_chat_message(
    request: ChatRequest,
    session: AsyncSessionDep
) -> StreamingResponse:
    adapter = OllamaAdapter()
    visual_blocks = [block.model_dump() for block in infer_visual_blocks(request.message)]
    
    logger.info(f"Stream request received with active_document_ids: {request.active_document_ids}")

    async def event_stream():
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
        
        if not _is_simple_greeting(request.message):
            # Pipeline: Searching
            if request.active_document_ids:
                search_label = "Searching attached documents..."
            else:
                search_label = "Searching educational materials..."
            yield f"data: {json.dumps({'type': 'pipeline', 'stage': 'searching_textbook', 'label': search_label})}\n\n"
            
            filters = {}
            if request.active_document_ids:
                filters["document_ids"] = request.active_document_ids

            rag_results = retriever.retrieve(query=request.message, filters=filters, top_k=3)
            context_text = "\n\n".join([f"Source: {r['source']} (Page {r['page']})\n{r['content']}" for r in rag_results])
            
            sources = list(set(r['source'] for r in rag_results))
            logger.info(f'[RAG] query="{request.message}" chunks_found={len(rag_results)} sources={sources}')
            
            # Optionally yield chunk citations here if needed for frontend UX
            for chunk in rag_results:
                yield f"data: {json.dumps({'type': 'citation', 'chunk_id': chunk['chunk_id'], 'source': chunk['source'], 'page': chunk['page'], 'score': chunk['score']})}\n\n"
        
        if not visual_blocks:
            from app.services.ai.concept_detector import detect_concept
            
            concept = detect_concept(request.message, context_text)
            if concept and concept["confidence"] > 0.7:
                logger.info(f'[VISUAL] concept_detected={concept["concept_id"]} confidence={concept["confidence"]}')
                cid = concept["concept_id"]
                
                mapping = {
                    "newton_second_law": ("physics.forceMotion", {}),
                    "projectile_motion": ("physics.projectile", {}),
                    "quadratic_equation": ("math.quadraticGraph", {}),
                    "geometry_triangle": ("math.triangleGeometry", {}),
                    "probability": ("math.probabilitySim", {}),
                    "kinematics": ("physics.engineLab", {"scenario": "kinematics"}),
                    "momentum": ("physics.engineLab", {"scenario": "force"})
                }
                
                if cid in mapping:
                    vtype, vparams = mapping[cid]
                    visual_blocks.append({
                        "id": f"rag-visual-{cid}",
                        "type": vtype,
                        "params": vparams
                    })
                    # Re-emit meta if we added a block from RAG
                    yield f"data: {json.dumps({'type': 'meta', 'model': settings.ollama_model, 'visual_blocks': visual_blocks})}\n\n"
        
        system_prompt, user_prompt = build_tutor_prompt(
            request.message, 
            request.learning_mode, 
            context=context_text,
            active_document_filenames=active_filenames
        )
        
        # Pipeline: Generating
        yield f"data: {json.dumps({'type': 'pipeline', 'stage': 'generating_answer', 'label': 'Generating answer...'})}\n\n"
        
        try:
            full_response = ""
            async for line in adapter.stream(user_prompt, request.history, system_prompt=system_prompt, temperature=0.2):
                payload = json.loads(line)
                content = payload.get("message", {}).get("content", "")
                if content:
                    full_response += content
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
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

    return StreamingResponse(event_stream(), media_type="text/event-stream")
