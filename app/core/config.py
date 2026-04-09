from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

DEFAULT_CORS_ALLOWED_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",
    "http://0.0.0.0:3000",
]

DESKTOP_CORS_ALLOWED_ORIGINS = [
    "tauri://localhost",
    "http://tauri.localhost",
    "https://tauri.localhost",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="VBZ_",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Verbalaize - Audio Transcription Service"
    app_version: str = "1.0.0"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8000
    serve_frontend_dist: bool = False
    desktop_mode: bool = False
    disable_startup_preload: bool = False
    cors_allowed_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    ffmpeg_bin_dir: str | None = None

    # Whisper configuration
    whisper_model_cache_dir: str = "./.whisper_models"

    # VerbAIze specific settings (speedup features)
    enable_speedup: bool = False
    speed_small: float = 1.25
    speed_medium: float = 1.5
    speed_turbo: float = 1.25

    # File upload settings
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    allowed_file_types: list = [
        "audio/mpeg",  # mp3
        "audio/mp4",  # m4a, mp4
        "audio/wav",
        "audio/ogg",  # ogg, opus
        "audio/webm",
        "audio/flac",
        "audio/aac",
        "audio/3gpp",
        "audio/3gpp2",
        "audio/amr",
        "application/octet-stream",  # Fallback for undetected types
    ]

    # Real-time transcription settings
    realtime_chunk_duration: int = 5  # seconds
    realtime_sample_rate: int = 16000

    # Security — set VBZ_APP_SECRET to enable token validation.
    # When None, the middleware is disabled (Docker / web deployments).
    # In desktop mode, Tauri generates this at launch and passes it to both
    # the Python sidecar and the frontend runtime bridge.
    app_secret: str | None = None

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def parse_cors_allowed_origins(cls, value):
        if value is None or value == "":
            return []

        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]

        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]

        raise ValueError("Invalid VBZ_CORS_ALLOWED_ORIGINS value")

    @property
    def resolved_cors_allowed_origins(self) -> list[str]:
        origins = list(DEFAULT_CORS_ALLOWED_ORIGINS)

        if self.desktop_mode:
            origins.extend(DESKTOP_CORS_ALLOWED_ORIGINS)

        origins.extend(self.cors_allowed_origins)

        deduped: list[str] = []
        for origin in origins:
            if origin not in deduped:
                deduped.append(origin)

        return deduped


settings = Settings()
