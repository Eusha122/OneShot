from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class InferenceSettings(BaseSettings):
    # ── Local Ollama ─────────────────────────────────────────────────────────
    ollama_base_url: str = "http://ollama:11434"
    ollama_model: str = "qwen2.5:1.5b"
    inference_timeout: int = 60

    # ── Provider selection ────────────────────────────────────────────────────
    # local      → always use local Ollama (default, no cloud needed)
    # production → always use cloud API (Ollama not required)
    # fallback   → use Ollama, switch to cloud only when Ollama fails
    ai_provider: Literal["local", "production", "fallback"] = "local"

    # ── Cloud AI (OpenAI-compatible endpoint) ─────────────────────────────────
    cloud_ai_url: str = ""   # e.g. https://xxx.agents.do-ai.run/api/v1
    cloud_ai_key: str = ""   # Bearer token
    cloud_ai_model: str = "" # optional — agents usually don't need this

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


inference_settings = InferenceSettings()
