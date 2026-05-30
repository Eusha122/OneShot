"""
CloudAIClient — OpenAI-compatible client for DigitalOcean AI agents.

Key behaviours
--------------
* Only sends `messages` (+ optional `model`) in every request — DO AI agents
  reject extra fields like `temperature`, `stream`, or `response_format`.
* `stream()` uses the non-streaming endpoint and yields the response word-by-word
  so callers that expect a streaming generator still work unchanged.
* Output is normalised to Ollama's line format:
      {"response": "<text>", "done": false}
      {"response": "", "done": true}
  so every caller that does `json.loads(chunk).get("response")` works with no changes.
"""
import asyncio
import json
import logging
from typing import AsyncGenerator

import httpx

from app.core.inference_settings import inference_settings
from app.services.ai.ollama_client import InfrastructureError, InferenceError

logger = logging.getLogger(__name__)

_CLOUD_TIMEOUT = 90          # non-streaming generation; generous for cloud
_CLOUD_CONNECT_TIMEOUT = 15  # TCP connect + TLS handshake


class CloudAIClient:
    """
    Calls an OpenAI-compatible /chat/completions endpoint.
    Raises InfrastructureError / InferenceError so AIRouter can catch them
    with the same logic it uses for OllamaClient.
    """

    def __init__(self):
        self._base_url = inference_settings.cloud_ai_url.rstrip("/")
        self._api_key = inference_settings.cloud_ai_key
        self._model = inference_settings.cloud_ai_model or None

        self._client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(
                connect=_CLOUD_CONNECT_TIMEOUT,
                read=_CLOUD_TIMEOUT,
                write=10.0,
                pool=5.0,
            ),
        )
        logger.info("[CloudAI] Client initialised. endpoint=%s", self._base_url)

    async def close(self):
        await self._client.aclose()

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _messages(self, prompt: str, history: list, system_prompt: str | None) -> list[dict]:
        # DO AI agents reject "system" role messages — the agent's instructions
        # are configured in the DO dashboard, not passed via the API.
        msgs: list[dict] = []
        for msg in history[-8:]:
            role = msg.role if hasattr(msg, "role") else msg["role"]
            content = msg.content if hasattr(msg, "content") else msg["content"]
            if role in ("user", "assistant"):
                msgs.append({"role": role, "content": content})
        msgs.append({"role": "user", "content": prompt})
        return msgs

    def _payload(self, messages: list[dict]) -> dict:
        """
        Minimal payload — only fields the DO AI agent is known to accept.
        Extra fields (temperature, stream, response_format) cause HTTP 400.
        """
        body: dict = {"messages": messages}
        if self._model:
            body["model"] = self._model
        return body

    async def _call(self, messages: list[dict], timeout: int | None = None) -> str:
        """Single non-streaming POST; returns the assistant content string."""
        body = self._payload(messages)
        request_timeout = httpx.Timeout(
            connect=_CLOUD_CONNECT_TIMEOUT,
            read=float(timeout or _CLOUD_TIMEOUT),
            write=10.0,
            pool=5.0,
        )
        try:
            response = await self._client.post(
                f"{self._base_url}/chat/completions",
                json=body,
                timeout=request_timeout,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            body_preview = e.response.text[:300]
            logger.error("[CloudAI] HTTP %s: %s", e.response.status_code, body_preview)
            raise InfrastructureError(
                f"Cloud AI HTTP error {e.response.status_code}: {body_preview}"
            ) from e
        except httpx.RequestError as e:
            raise InfrastructureError(f"Cloud AI connection error: {e}") from e

        try:
            data = response.json()
            content: str = data["choices"][0]["message"]["content"]
            if not content.strip():
                raise InferenceError("Empty completion returned by cloud model")
            return content.strip()
        except (KeyError, IndexError) as e:
            raise InferenceError(
                f"Unexpected cloud API response shape: {e} — raw: {response.text[:200]}"
            ) from e

    # ── Public interface (same signatures as OllamaClient) ────────────────────

    async def generate(
        self,
        prompt: str,
        history: list,
        system_prompt: str | None = None,
        temperature: float = 0.7,   # accepted but not forwarded (agent ignores it)
        response_format: str | None = None,
        timeout: int | None = None,
    ) -> str:
        messages = self._messages(prompt, history, system_prompt)
        logger.info("[CloudAI] generate() — %d messages", len(messages))
        return await self._call(messages, timeout=timeout)

    async def stream(
        self,
        prompt: str,
        history: list,
        system_prompt: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """
        The DO AI agent doesn't support SSE streaming.
        We call the non-streaming endpoint and yield the response
        token-by-token (splitting on spaces) so the UI still gets
        progressive output.
        """
        messages = self._messages(prompt, history, system_prompt)
        logger.info("[CloudAI] stream() (simulated) — %d messages", len(messages))

        full_text = await self._call(messages)

        # Yield word-by-word with a small delay to simulate typing
        words = full_text.split(" ")
        for i, word in enumerate(words):
            token = word if i == 0 else " " + word
            yield json.dumps({"response": token, "done": False})
            await asyncio.sleep(0.01)  # ~100 words/sec — fast but visible

        yield json.dumps({"response": "", "done": True})

    async def check_health(self) -> dict:
        try:
            result = await self._call(
                [{"role": "user", "content": "ping"}],
                timeout=10,
            )
            return {"status": "healthy", "response_sample": result[:30]}
        except Exception as e:
            raise InfrastructureError(f"Cloud AI health check failed: {e}") from e
