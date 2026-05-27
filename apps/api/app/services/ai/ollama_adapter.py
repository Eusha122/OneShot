import httpx

from app.core.config import settings
from app.schemas.chat import ChatMessage

DEFAULT_SYSTEM_PROMPT = (
    "You are OneShot, an interactive STEM tutor. Your goal is to explain math and physics "
    "problems in the simplest, easiest, and most conceptual way possible. Break down complex steps, "
    "use clean Markdown, short sections, bullet points, and LaTeX for formulas ($...$ for inline "
    "and $$...$$ for display). Always refer to the interactive animation or graph displayed below "
    "the response so the student can experiment with the parameters (e.g. speed, force, coefficients)."
)


class OllamaAdapter:
    def __init__(self, base_url: str = settings.ollama_base_url, model: str = settings.ollama_model):
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def generate(
        self,
        prompt: str,
        history: list[ChatMessage],
        system_prompt: str | None = None,
        temperature: float = 0.7,
    ) -> str:
        async with httpx.AsyncClient(timeout=180) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": self._build_messages(prompt, history, system_prompt),
                    "stream": False,
                    "options": {"temperature": temperature},
                },
            )
            response.raise_for_status()

        payload = response.json()
        content = payload.get("message", {}).get("content", "")
        return content.strip()

    async def stream(
        self,
        prompt: str,
        history: list[ChatMessage],
        system_prompt: str | None = None,
        temperature: float = 0.7,
    ):
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": self._build_messages(prompt, history, system_prompt),
                    "stream": True,
                    "options": {"temperature": temperature},
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    yield line

    def _build_messages(
        self,
        prompt: str,
        history: list[ChatMessage],
        system_prompt: str | None = None,
    ) -> list[dict[str, str]]:
        return [
            {
                "role": "system",
                "content": system_prompt or DEFAULT_SYSTEM_PROMPT,
            },
            *[message.model_dump() for message in history[-8:]],
            {"role": "user", "content": prompt},
        ]
