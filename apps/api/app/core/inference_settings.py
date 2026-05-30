import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class InferenceSettings(BaseSettings):
    ollama_base_url: str = "http://ollama:11434"
    ollama_model: str = "qwen2.5:1.5b"
    inference_timeout: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

inference_settings = InferenceSettings()
