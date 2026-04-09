import asyncio
import logging
import os
import tempfile
import warnings
from collections import defaultdict
from typing import Any, Callable, Dict

from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.schemas.transcription import (
    ActionType,
    ModelType,
    TranscriptionResponse,
)

# Suppress FP16 warnings on CPU
warnings.filterwarnings("ignore", message="FP16 is not supported on CPU")

logger = logging.getLogger(__name__)

try:
    import torch
except ImportError:  # pragma: no cover - depends on local runtime
    torch = None

try:
    import whisper
except ImportError:  # pragma: no cover - depends on local runtime
    whisper = None


class WhisperService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized"):
            return
        self._models: Dict[str, Any] = {}
        self._locks = defaultdict(asyncio.Lock)
        self.device = (
            "cuda"
            if torch is not None and torch.cuda.is_available()
            else "cpu"
        )
        self._initialized = True
        logger.info(f"WhisperService initialized with device: {self.device}")

    def _ensure_runtime_dependencies(self):
        if whisper is None:
            raise HTTPException(
                status_code=500,
                detail=(
                    "The 'openai-whisper' package is not installed in the "
                    "current Python environment."
                ),
            )

    async def _load_model_blocking(self, model_name: str) -> Any:
        """Load Whisper model in executor to avoid blocking event loop"""
        self._ensure_runtime_dependencies()
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,
            lambda: whisper.load_model(
                model_name,
                device=self.device,
                download_root=settings.whisper_model_cache_dir,
            ),
        )

    async def _get_model(self, model_type: ModelType) -> Any:
        """Load and cache Whisper model with async loading and locking"""
        model_name = model_type.value

        # Map turbo to medium for memory efficiency (large-v3 is too big)
        if model_name == "turbo":
            model_name = "turbo"

        # Check if model is already loaded
        if model_name not in self._models:
            # Use lock to prevent multiple simultaneous loads of the same model
            async with self._locks[model_name]:
                # Double-check pattern - model might have been loaded
                # while waiting for lock
                if model_name not in self._models:
                    try:
                        logger.info(
                            f"Loading Whisper model '{model_name}' for first time..."
                        )
                        self._models[
                            model_name
                        ] = await self._load_model_blocking(model_name)
                        logger.info(
                            f"Successfully loaded Whisper model '{model_name}'"
                        )
                    except Exception as e:
                        logger.error(
                            f"Failed to load model {model_name}: {str(e)}"
                        )
                        raise HTTPException(
                            status_code=500,
                            detail=f"Failed to load model {model_name}: {str(e)}",
                        )
                else:
                    logger.debug(
                        f"Model '{model_name}' already loaded by another request"
                    )
        else:
            logger.debug(f"Using cached model '{model_name}'")

        return self._models[model_name]

    async def _transcribe_with_model(
        self,
        model: Any,
        file_path: str,
        action: ActionType,
    ) -> str:
        """Execute transcription with model in executor to avoid blocking"""
        loop = asyncio.get_running_loop()

        def _transcribe():
            # Common parameters to avoid FP16 warnings
            kwargs = {"fp16": False}

            if action == ActionType.TRANSCRIBE:
                return model.transcribe(file_path, **kwargs)
            if action == ActionType.TRANSLATE_ENGLISH:
                return model.transcribe(file_path, task="translate", **kwargs)

            return model.transcribe(file_path, **kwargs)

        result = await loop.run_in_executor(None, _transcribe)
        return result["text"].strip()

    async def _emit_progress_heartbeat(
        self,
        on_progress: Callable[[int, str], None] | None,
        stage: str,
        start_progress: int,
        end_progress: int,
        stop_event: asyncio.Event,
        interval_seconds: float = 0.35,
    ) -> None:
        if on_progress is None or end_progress <= start_progress:
            return

        current_progress = start_progress
        on_progress(current_progress, stage)

        while not stop_event.is_set():
            await asyncio.sleep(interval_seconds)
            if stop_event.is_set():
                break

            if current_progress < end_progress:
                current_progress += 1
                on_progress(current_progress, stage)

    def _validate_audio_file(
        self, filename: str | None, content_type: str | None
    ) -> str:
        allowed_extensions = {
            ".mp3",
            ".m4a",
            ".wav",
            ".opus",
            ".ogg",
            ".flac",
            ".aac",
            ".webm",
            ".mp4",
            ".3gp",
            ".amr",
        }

        file_extension = None
        if filename:
            file_extension = f".{filename.split('.')[-1].lower()}"

        is_valid_content_type = content_type in settings.allowed_file_types
        is_valid_extension = (
            file_extension in allowed_extensions if file_extension else False
        )

        if not (is_valid_content_type or is_valid_extension):
            supported_formats = (
                "MP3, M4A, WAV, OPUS, OGG, FLAC, AAC, WebM, MP4, 3GP, AMR"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {content_type}. "
                f"Supported formats: {supported_formats}",
            )

        return file_extension or ".wav"

    async def transcribe_file_path(
        self,
        file_path: str,
        filename: str | None,
        content_type: str | None,
        model_type: ModelType,
        action: ActionType,
        on_progress: Callable[[int, str], None] | None = None,
    ) -> TranscriptionResponse:
        file_extension = self._validate_audio_file(filename, content_type)

        if not file_path.endswith(file_extension) and filename:
            logger.debug(
                "Processing file path %s with original filename %s",
                file_path,
                filename,
            )

        if on_progress is not None:
            on_progress(15, "audio_received")

        try:
            if on_progress is not None:
                on_progress(25, "loading_model")

            load_stop_event = asyncio.Event()
            load_progress_task = asyncio.create_task(
                self._emit_progress_heartbeat(
                    on_progress=on_progress,
                    stage="loading_model",
                    start_progress=25,
                    end_progress=54,
                    stop_event=load_stop_event,
                )
            )
            try:
                model = await self._get_model(model_type)
            finally:
                load_stop_event.set()
                await load_progress_task

            if on_progress is not None:
                on_progress(55, "model_ready")
                on_progress(60, "transcribing")

            transcription_stop_event = asyncio.Event()
            transcription_progress_task = asyncio.create_task(
                self._emit_progress_heartbeat(
                    on_progress=on_progress,
                    stage="transcribing",
                    start_progress=60,
                    end_progress=94,
                    stop_event=transcription_stop_event,
                )
            )
            try:
                text_result = await self._transcribe_with_model(
                    model, file_path, action
                )
            finally:
                transcription_stop_event.set()
                await transcription_progress_task

            if on_progress is not None:
                on_progress(95, "finalizing")

            return TranscriptionResponse(
                model=model_type.value,
                action=action.value,
                text=text_result,
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Transcription failed: {str(e)}"
            )

    async def transcribe_file(
        self,
        file: UploadFile,
        model_type: ModelType,
        action: ActionType,
    ) -> TranscriptionResponse:
        """Transcribe uploaded audio file"""

        file_extension = self._validate_audio_file(
            file.filename, file.content_type
        )
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=file_extension
        ) as temp_file:
            try:
                content = await file.read()
                temp_file.write(content)
                temp_file.flush()
                return await self.transcribe_file_path(
                    file_path=temp_file.name,
                    filename=file.filename,
                    content_type=file.content_type,
                    model_type=model_type,
                    action=action,
                )
            finally:
                if os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)

    async def transcribe_realtime_chunk(
        self,
        audio_data: bytes,
        model_type: ModelType,
        action: ActionType,
    ) -> str:
        """Transcribe real-time audio chunk"""

        logger.debug(f"Transcribing chunk of {len(audio_data)} bytes")

        # Validate minimum audio data size
        if len(audio_data) < 1024:  # Less than 1KB
            logger.warning(f"Audio chunk too small: {len(audio_data)} bytes")
            return ""

        # Create temporary file for audio chunk
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".webm"
        ) as temp_file:
            try:
                temp_file.write(audio_data)
                temp_file.flush()

                logger.debug(f"Wrote audio chunk to {temp_file.name}")

                # Load model
                model = await self._get_model(model_type)

                # Transcribe chunk with error handling
                try:
                    transcription = await self._transcribe_with_model(
                        model, temp_file.name, action
                    )

                    logger.debug(f"Transcription result: '{transcription}'")

                    return transcription

                except Exception as e:
                    logger.error(f"Whisper transcription failed: {str(e)}")
                    # Return empty string instead of raising exception
                    return ""

            except Exception as e:
                logger.error(f"Error processing audio chunk: {str(e)}")
                raise Exception(f"Real-time transcription failed: {str(e)}")
            finally:
                # Clean up temporary file
                try:
                    if os.path.exists(temp_file.name):
                        os.unlink(temp_file.name)
                        logger.debug(f"Cleaned up temp file {temp_file.name}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp file: {str(e)}")


# Global service instance (singleton)
whisper_service = WhisperService()


def get_whisper_service() -> WhisperService:
    """Get the global WhisperService instance"""
    return whisper_service
