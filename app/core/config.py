from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Verbalaize - Audio Transcription Service"
    app_version: str = "1.0.0"
    debug: bool = True

    # OpenAI API Key (if using OpenAI's API instead of local Whisper)
    openai_api_key: Optional[str] = None

    # Whisper configuration
    whisper_model_cache_dir: str = "./whisper_models"

    # File upload settings
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    allowed_file_types: list = [
        # MP3 formats
        "audio/mpeg",
        "audio/mp3",
        # M4A formats
        "audio/mp4",
        "audio/m4a",
        "audio/x-m4a",
        "audio/mp4a",
        # WAV formats
        "audio/wav",
        "audio/wave",
        "audio/x-wav",
        # Opus formats
        "audio/opus",
        "audio/ogg",
        "audio/x-opus",
        # WebM formats
        "audio/webm",
        # FLAC formats
        "audio/flac",
        "audio/x-flac",
        # AAC formats
        "audio/aac",
        "audio/x-aac",
        # Other common formats
        "audio/3gpp",
        "audio/3gpp2",
        "audio/amr",
        "audio/x-amr",
        "application/octet-stream",  # Fallback for undetected types
    ]

    # Real-time transcription settings
    realtime_chunk_duration: int = 5  # seconds
    realtime_sample_rate: int = 16000

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
