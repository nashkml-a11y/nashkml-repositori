from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://songchord:songchord@postgres:5432/songchord"
    redis_url: str = "redis://redis:6379/0"

    openai_api_key: str = ""
    openai_stt_model: str = "whisper-1"

    storage_dir: str = "/data/storage"
    max_upload_bytes: int = 50 * 1024 * 1024  # 50 MB
    allowed_extensions: tuple[str, ...] = (".mp3", ".wav", ".m4a")
    allowed_mime_types: tuple[str, ...] = (
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/mp4",
        "audio/x-m4a",
        "audio/m4a",
    )

    cors_origins: list[str] = ["http://localhost:3000"]

    min_chord_duration_seconds: float = 0.8


@lru_cache
def get_settings() -> Settings:
    return Settings()
