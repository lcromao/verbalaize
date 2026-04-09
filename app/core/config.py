from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="VBZ_",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Verbalaize - Audio Transcription Service"
    app_version: str = "1.0.0"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000

    # Whisper configuration
    whisper_model_cache_dir: str = "./whisper_models"

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


settings = Settings()
