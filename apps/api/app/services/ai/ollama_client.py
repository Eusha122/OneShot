import httpx
import logging
from typing import AsyncGenerator
from datetime import datetime, timedelta

from app.core.inference_settings import inference_settings
from app.schemas.chat import ChatMessage

logger = logging.getLogger(__name__)

class InfrastructureError(Exception):
    pass

class InferenceError(Exception):
    pass

class ValidationError(Exception):
    pass

class OllamaClient:
    def __init__(self):
        self.base_url = inference_settings.ollama_base_url.rstrip("/")
        self.model = inference_settings.ollama_model
        self.timeout = inference_settings.inference_timeout
        # Singleton client for connection pooling
        self._client = httpx.AsyncClient(timeout=self.timeout)
        
        # Circuit breaker logic
        self.failure_count = 0
        self.cooldown_until = None
        self.max_failures = 3
        self.cooldown_duration = timedelta(seconds=30)
        
        logger.info(f"[OLLAMA] Initialized client with endpoint: {self.base_url}, model: {self.model}")

    async def close(self):
        await self._client.aclose()

    def _check_circuit_breaker(self):
        if self.cooldown_until and datetime.utcnow() < self.cooldown_until:
            raise InfrastructureError("Ollama inference service temporarily disabled (cooldown)")
        if self.cooldown_until and datetime.utcnow() >= self.cooldown_until:
            # Reset on cooldown expiration
            self.failure_count = 0
            self.cooldown_until = None

    def _record_failure(self):
        self.failure_count += 1
        if self.failure_count >= self.max_failures:
            self.cooldown_until = datetime.utcnow() + self.cooldown_duration
            logger.error(f"[OLLAMA] Circuit breaker tripped! Cooling down for {self.cooldown_duration.total_seconds()}s.")

    def _record_success(self):
        if self.failure_count > 0:
            self.failure_count = 0
            self.cooldown_until = None
            logger.info("[OLLAMA] Service recovered. Circuit breaker reset.")

    async def check_health(self) -> dict:
        try:
            self._check_circuit_breaker()
            # Check model exists
            response = await self._client.get(f"{self.base_url}/api/tags", timeout=5)
            response.raise_for_status()
            data = response.json()
            models = [m.get("name") for m in data.get("models", [])]
            
            if self.model not in models:
                self._record_failure()
                raise InfrastructureError(f"Required model {self.model} not found in Ollama")
                
            # Endpoint detection
            self.active_endpoint = "/api/generate" # Default
                
            self._record_success()
            return {"status": "healthy", "model_available": True, "active_endpoint": getattr(self, "active_endpoint", "/api/generate")}
        except httpx.RequestError as e:
            self._record_failure()
            raise InfrastructureError(f"Ollama connection failed: {e}")
        except Exception as e:
            self._record_failure()
            raise InfrastructureError(f"Ollama health check failed: {e}")

    async def generate(self, prompt: str, history: list[ChatMessage], system_prompt: str | None = None, temperature: float = 0.7, response_format: str | None = None) -> str:
        self._check_circuit_breaker()
        
        payload = {
            "model": self.model,
            "prompt": self._build_prompt(prompt, history, system_prompt),
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_ctx": 4096
            },
        }
        
        if response_format == "json":
            payload["format"] = "json"

        logger.info(f"[OLLAMA] Generating response using model {self.model}...")
        endpoint = getattr(self, "active_endpoint", "/api/generate")
        
        import asyncio
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                response = await self._client.post(
                    f"{self.base_url}{endpoint}",
                    json=payload,
                )
                response.raise_for_status()
                self._record_success()
                
                try:
                    data = response.json()
                    content = data.get("response", "")
                    if not content.strip():
                        raise InferenceError("Empty completion returned by model")
                    return content.strip()
                except Exception as e:
                    if not isinstance(e, InferenceError):
                        raise InferenceError(f"Failed to parse Ollama response: {e}")
                    raise
            except httpx.HTTPStatusError as e:
                self._record_failure()
                status = e.response.status_code
                if status in (404, 401, 400):
                    logger.exception(f"Ollama inference request failed: Client error ({status})")
                    raise InfrastructureError(f"Ollama inference service unavailable ({status})")
                
                if attempt == max_retries:
                    raise InfrastructureError(f"Ollama HTTP error after {max_retries} retries: {status}")
                
                logger.warning(f"[OLLAMA] Transient 5xx error ({status}). Retrying {attempt + 1}/{max_retries}...")
                await asyncio.sleep(2 ** attempt)
            except httpx.RequestError as e:
                self._record_failure()
                # connection refused vs timeout
                if isinstance(e, httpx.ConnectError):
                    logger.exception("Ollama inference request failed: Connection Refused")
                    raise InfrastructureError(f"Ollama connection refused: {e}")
                
                if attempt == max_retries:
                    raise InfrastructureError(f"Ollama connection/timeout error after {max_retries} retries: {e}")
                    
                logger.warning(f"[OLLAMA] Transient request error ({type(e).__name__}). Retrying {attempt + 1}/{max_retries}...")
                await asyncio.sleep(2 ** attempt)

    async def stream(self, prompt: str, history: list[ChatMessage], system_prompt: str | None = None, temperature: float = 0.7) -> AsyncGenerator[str, None]:
        self._check_circuit_breaker()
        
        payload = {
            "model": self.model,
            "prompt": self._build_prompt(prompt, history, system_prompt),
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_ctx": 2048
            },
        }
        
        import asyncio
        endpoint = getattr(self, "active_endpoint", "/api/generate")
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                async with self._client.stream("POST", f"{self.base_url}{endpoint}", json=payload) as response:
                    response.raise_for_status()
                    self._record_success()
                    async for line in response.aiter_lines():
                        if line:
                            yield line
                return
            except httpx.HTTPStatusError as e:
                self._record_failure()
                status = e.response.status_code
                if status in (404, 401, 400):
                    logger.exception(f"Ollama streaming failed: Client error ({status})")
                    raise InfrastructureError(f"Ollama inference service unavailable ({status})")
                
                if attempt == max_retries:
                    raise InfrastructureError(f"Ollama HTTP error after {max_retries} retries: {status}")
                
                logger.warning(f"[OLLAMA] Transient 5xx error streaming ({status}). Retrying {attempt + 1}/{max_retries}...")
                await asyncio.sleep(2 ** attempt)
            except httpx.RequestError as e:
                self._record_failure()
                if isinstance(e, httpx.ConnectError):
                    logger.exception("Ollama streaming request failed: Connection Refused")
                    raise InfrastructureError(f"Ollama connection refused: {e}")
                
                if attempt == max_retries:
                    raise InfrastructureError(f"Ollama connection/timeout error streaming after {max_retries} retries: {e}")
                    
                logger.warning(f"[OLLAMA] Transient request error streaming ({type(e).__name__}). Retrying {attempt + 1}/{max_retries}...")
                await asyncio.sleep(2 ** attempt)

    def _build_prompt(self, prompt: str, history: list[ChatMessage], system_prompt: str | None = None) -> str:
        DEFAULT_SYSTEM_PROMPT = (
            "You are OneShot, an interactive STEM tutor. Your goal is to explain math and physics "
            "problems in the simplest, easiest, and most conceptual way possible. Break down complex steps, "
            "use clean Markdown, short sections, bullet points, and LaTeX for formulas ($...$ for inline "
            "and $$...$$ for display). Always refer to the interactive animation or graph displayed below "
            "the response so the student can experiment with the parameters. "
            "If you want to provide a deeper derivation or explain *why* a certain law or formula works, "
            "wrap that deep explanation in HTML details tags to keep the main answer clean. "
            "Example:\n<details>\n<summary>Why is this true?</summary>\nBecause...\n</details>"
        )
        
        final_prompt = f"SYSTEM: {system_prompt or DEFAULT_SYSTEM_PROMPT}\n\n"
        for msg in history[-4:]:
            role = msg.role.upper()
            content = msg.content
            final_prompt += f"{role}: {content}\n\n"
            
        final_prompt += f"USER: {prompt}\n\nASSISTANT:"
        return final_prompt

ollama_client = OllamaClient()
