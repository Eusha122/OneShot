import logging

import httpx
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AsyncSessionDep
from app.core.config import settings
from app.db.repositories import MessageRepository
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.domain import MessageCreate
from app.services.ai.ollama_adapter import OllamaAdapter
from app.services.ai.prompt_policy import build_tutor_prompt
from app.services.ai.visual_blocks import infer_visual_blocks
from app.services.rag.retriever import retriever

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
async def create_chat_message(
    request: ChatRequest,
    session: AsyncSessionDep
) -> ChatResponse:
    adapter = OllamaAdapter()
    
    # Retrieve context
    rag_results = retriever.retrieve(query=request.message, filters={}, top_k=3)
    context_text = "\n\n".join([f"Source: {r['source']} (Page {r['page']})\n{r['content']}" for r in rag_results])
    
    prompt = build_tutor_prompt(request.message, request.learning_mode, context=context_text)

    try:
        content = await adapter.generate(prompt, request.history)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama returned {exc.response.status_code}") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Ollama is not reachable at the configured URL") from exc

    visual_blocks = infer_visual_blocks(request.message)
    
    if not visual_blocks and rag_results:
        top_topic = rag_results[0].get('topic', '').lower()
        if top_topic in ["kinematics", "force", "energy", "pressure", "waves", "optics", "electricity"]:
            from app.schemas.chat import VisualBlock
            visual_blocks.append(
                VisualBlock(
                    id=f"rag-visual-{top_topic}",
                    type="physics.engineLab",
                    params={"scenario": top_topic}
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

    async def event_stream():
        yield f"data: {json.dumps({'type': 'meta', 'model': settings.ollama_model, 'visual_blocks': visual_blocks})}\n\n"
        
        # Pipeline: Searching
        yield f"data: {json.dumps({'type': 'pipeline', 'stage': 'searching_textbook', 'label': 'Searching educational materials...'})}\n\n"
        
        rag_results = retriever.retrieve(query=request.message, filters={}, top_k=3)
        context_text = "\n\n".join([f"Source: {r['source']} (Page {r['page']})\n{r['content']}" for r in rag_results])
        
        if not visual_blocks and rag_results:
            top_topic = rag_results[0].get('topic', '').lower()
            if top_topic in ["kinematics", "force", "energy", "pressure", "waves", "optics", "electricity"]:
                new_block = {
                    "id": f"rag-visual-{top_topic}",
                    "type": "physics.engineLab",
                    "params": {"scenario": top_topic}
                }
                visual_blocks.append(new_block)
                # Re-emit meta if we added a block from RAG
                yield f"data: {json.dumps({'type': 'meta', 'model': settings.ollama_model, 'visual_blocks': visual_blocks})}\n\n"
        
        prompt = build_tutor_prompt(request.message, request.learning_mode, context=context_text)
        
        # Pipeline: Generating
        yield f"data: {json.dumps({'type': 'pipeline', 'stage': 'generating_answer', 'label': 'Generating answer...'})}\n\n"
        
        try:
            full_response = ""
            async for line in adapter.stream(prompt, request.history):
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
