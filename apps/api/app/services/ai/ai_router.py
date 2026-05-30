"""
AIRouter — single import point for all AI inference in OneShot.

Behaviour is controlled by the AI_PROVIDER env var:

    local       → always Ollama (default, no cloud config needed)
    production  → always cloud  (Ollama not started/needed)
    fallback    → Ollama first; transparent switch to cloud on InfrastructureError

All consumers (chat routes, exam_generator, etc.) import `ai_router` from here
instead of `ollama_client` directly.  The interface is identical so no call site
needs to change logic.
"""
import logging
from typing import AsyncGenerator

from app.core.inference_settings import inference_settings
from app.services.ai.ollama_client import (
    OllamaClient,
    ollama_client,
    InfrastructureError,
    InferenceError,
    ValidationError,
)

logger = logging.getLogger(__name__)

# Re-export error classes so callers only need one import
__all__ = ["ai_router", "InfrastructureError", "InferenceError", "ValidationError"]


class AIRouter:
    """
    Routes every AI call to the correct backend based on AI_PROVIDER.
    Exposes the same interface as OllamaClient.
    """

    def __init__(self):
        self._ollama: OllamaClient = ollama_client
        self._cloud = None  # lazy-init to avoid import errors when cloud is unused

        self.provider: str = inference_settings.ai_provider
        logger.info("[AIRouter] provider=%s", self.provider)

    # ── Cloud client (created once, on first need) ────────────────────────────

    def _get_cloud(self):
        if self._cloud is None:
            if not (inference_settings.cloud_ai_url and inference_settings.cloud_ai_key):
                raise InfrastructureError(
                    "Cloud AI is not configured. "
                    "Set CLOUD_AI_URL and CLOUD_AI_KEY in your .env file."
                )
            from app.services.ai.cloud_client import CloudAIClient
            self._cloud = CloudAIClient()
            logger.info("[AIRouter] CloudAIClient created.")
        return self._cloud

    # ── generate() ───────────────────────────────────────────────────────────

    async def generate(
        self,
        prompt: str,
        history: list,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        response_format: str | None = None,
        timeout: int | None = None,
    ) -> str:
        if self.provider == "production":
            return await self._get_cloud().generate(
                prompt, history, system_prompt, temperature, response_format, timeout
            )

        if self.provider == "fallback":
            try:
                return await self._ollama.generate(
                    prompt, history, system_prompt, temperature, response_format, timeout
                )
            except InfrastructureError as e:
                logger.warning("[AIRouter] Ollama failed (%s) — falling back to cloud", e)
                return await self._get_cloud().generate(
                    prompt, history, system_prompt, temperature, response_format, timeout
                )

        # local (default)
        return await self._ollama.generate(
            prompt, history, system_prompt, temperature, response_format, timeout
        )

    # ── stream() ─────────────────────────────────────────────────────────────

    async def stream(
        self,
        prompt: str,
        history: list,
        system_prompt: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        if self.provider == "production":
            async for chunk in self._get_cloud().stream(
                prompt, history, system_prompt, temperature
            ):
                yield chunk
            return

        if self.provider == "fallback":
            # If the circuit breaker is already open, skip Ollama entirely.
            cb_open = False
            try:
                self._ollama._check_circuit_breaker()
            except InfrastructureError:
                cb_open = True

            if cb_open:
                logger.warning("[AIRouter] Ollama circuit breaker open — using cloud directly")
                async for chunk in self._get_cloud().stream(
                    prompt, history, system_prompt, temperature
                ):
                    yield chunk
                return

            # Attempt Ollama; fall back to cloud only if it fails BEFORE yielding any chunk.
            # Mid-stream failures cannot be recovered because partial SSE was already sent.
            yielded = False
            try:
                async for chunk in self._ollama.stream(
                    prompt, history, system_prompt, temperature
                ):
                    yielded = True
                    yield chunk
            except InfrastructureError as e:
                if yielded:
                    # Already sent content to client — can't restart; re-raise so
                    # the route handler can send an error event.
                    raise
                logger.warning(
                    "[AIRouter] Ollama stream failed before first chunk (%s) — falling back to cloud", e
                )
                async for chunk in self._get_cloud().stream(
                    prompt, history, system_prompt, temperature
                ):
                    yield chunk
            return

        # local (default)
        async for chunk in self._ollama.stream(
            prompt, history, system_prompt, temperature
        ):
            yield chunk

    # ── health / lifecycle (used by main.py and health.py) ───────────────────

    async def check_health(self) -> dict:
        """
        Returns a status dict that reflects the *active* provider.
        Always runs both checks in fallback mode so the dashboard shows both.
        """
        results: dict = {"provider": self.provider}

        if self.provider in ("local", "fallback"):
            try:
                ollama_data = await self._ollama.check_health()
                results["ollama"] = "healthy"
                results["ollama_model"] = self._ollama.model
                results.update(ollama_data)
            except InfrastructureError as e:
                results["ollama"] = "degraded"
                results["ollama_error"] = str(e)

        if self.provider in ("production", "fallback"):
            try:
                cloud_data = await self._get_cloud().check_health()
                results["cloud"] = "healthy"
                results.update({f"cloud_{k}": v for k, v in cloud_data.items()})
            except InfrastructureError as e:
                results["cloud"] = "degraded"
                results["cloud_error"] = str(e)

        return results

    async def close(self):
        await self._ollama.close()
        if self._cloud is not None:
            await self._cloud.close()

    # ── Proxy properties that health.py accesses on the bare ollama_client ────

    @property
    def model(self) -> str:
        if self.provider == "production":
            return inference_settings.cloud_ai_model or "cloud"
        return self._ollama.model

    @property
    def cooldown_until(self):
        return self._ollama.cooldown_until


ai_router = AIRouter()
