from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_env: str = "development"
    web_origin: str = "http://localhost:5173"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:3b"
    environment: str = "development"
    debug: bool = False
    rag_similarity_threshold: float = 0.35
    rag_debug: bool = False
    database_url: str = f"sqlite+aiosqlite:///{BASE_DIR}/oneshot.db"
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    searxng_base_url: str = "http://localhost:8080"
    cors_extra_origins: list[str] = Field(default_factory=list)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [self.web_origin, "http://127.0.0.1:5173", *self.cors_extra_origins]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
