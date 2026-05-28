import httpx

from app.core.config import settings
from app.schemas.chat import ChatMessage

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
        response_format: str | None = None,
    ) -> str:
        async with httpx.AsyncClient(timeout=None) as client:
            payload = {
                "model": self.model,
                "messages": self._build_messages(prompt, history, system_prompt),
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_ctx": 4096
                },
            }
            # Removed format="json" because it forces strict parsing which can hang small models (like 1.5b)
            # if they output invalid characters. We rely on prompt engineering instead.

            response = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
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
                    "options": {
                        "temperature": temperature,
                        "num_ctx": 2048
                    },
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
            *[message.model_dump() for message in history[-4:]],
            {"role": "user", "content": prompt},
        ]
