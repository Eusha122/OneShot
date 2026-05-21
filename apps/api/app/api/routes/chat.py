import httpx
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai.ollama_adapter import OllamaAdapter
from app.services.ai.prompt_policy import build_tutor_prompt
from app.services.ai.visual_blocks import infer_visual_blocks

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
async def create_chat_message(request: ChatRequest) -> ChatResponse:
    adapter = OllamaAdapter()
    prompt = build_tutor_prompt(request.message, request.learning_mode)

    try:
        content = await adapter.generate(prompt, request.history)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama returned {exc.response.status_code}") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Ollama is not reachable at the configured URL") from exc

    return ChatResponse(
        content=content,
        visual_blocks=infer_visual_blocks(request.message),
        model=settings.ollama_model,
    )


@router.post("/stream")
async def stream_chat_message(request: ChatRequest) -> StreamingResponse:
    adapter = OllamaAdapter()
    prompt = build_tutor_prompt(request.message, request.learning_mode)
    visual_blocks = [block.model_dump() for block in infer_visual_blocks(request.message)]

    async def event_stream():
        yield f"data: {json.dumps({'type': 'meta', 'model': settings.ollama_model, 'visual_blocks': visual_blocks})}\n\n"
        try:
            async for line in adapter.stream(prompt, request.history):
                payload = json.loads(line)
                content = payload.get("message", {}).get("content", "")
                if content:
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
                if payload.get("done"):
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except httpx.HTTPStatusError as exc:
            yield f"data: {json.dumps({'type': 'error', 'content': f'Ollama returned {exc.response.status_code}'})}\n\n"
        except httpx.HTTPError:
            yield f"data: {json.dumps({'type': 'error', 'content': 'Ollama is not reachable at the configured URL'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
