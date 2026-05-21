import httpx

from app.core.config import settings
from app.schemas.chat import ChatMessage


class OllamaAdapter:
    def __init__(self, base_url: str = settings.ollama_base_url, model: str = settings.ollama_model):
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def generate(self, prompt: str, history: list[ChatMessage]) -> str:
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": self._build_messages(prompt, history),
                    "stream": False,
                },
            )
            response.raise_for_status()

        payload = response.json()
        content = payload.get("message", {}).get("content", "")
        return content.strip()

    async def stream(self, prompt: str, history: list[ChatMessage]):
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": self._build_messages(prompt, history),
                    "stream": True,
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    yield line

    def _build_messages(self, prompt: str, history: list[ChatMessage]) -> list[dict[str, str]]:
        return [
            {
                "role": "system",
                "content": (
                    "You are OneShot, a concise STEM tutor. Use clean Markdown, short sections, "
                    "bullet points where helpful, and LaTeX for formulas. Use $...$ for inline math "
                    "and $$...$$ for display equations. Write fractions as \\frac{numerator}{denominator}, "
                    "never as plain 1/2 inside math. For STEM answers, prefer this structure when useful: "
                    "title, concept, formula, steps, key points, summary."
                ),
            },
            *[message.model_dump() for message in history[-8:]],
            {"role": "user", "content": prompt},
        ]
