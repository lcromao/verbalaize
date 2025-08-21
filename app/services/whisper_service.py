import asyncio
import logging
import os
import tempfile
import warnings
from collections import defaultdict
from typing import Any, Dict, Optional

import torch
import whisper
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


class WhisperService:
    _instance = None
    _lock = asyncio.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized"):
            return
        self._models: Dict[str, Any] = {}
        self._locks = defaultdict(asyncio.Lock)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._initialized = True
        logger.info(f"WhisperService initialized with device: {self.device}")

    async def _load_model_blocking(self, model_name: str) -> Any:
        """Load Whisper model in executor to avoid blocking event loop"""
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
        target_language: Optional[str] = None,
    ) -> str:
        """Execute transcription with model in executor to avoid blocking"""
        loop = asyncio.get_running_loop()

        def _transcribe():
            # Common parameters to avoid FP16 warnings
            kwargs = {"fp16": False}

            if action == ActionType.TRANSCRIBE:
                return model.transcribe(file_path, **kwargs)
            elif action == ActionType.TRANSLATE_ENGLISH:
                return model.transcribe(file_path, task="translate", **kwargs)
            elif action == ActionType.TRANSLATE_LANGUAGE:
                # For custom language translation, we first transcribe then
                # would need additional translation service (not implemented)
                return model.transcribe(file_path, **kwargs)
                # TODO: Implement translation to target_language
            else:
                return model.transcribe(file_path, **kwargs)

        result = await loop.run_in_executor(None, _transcribe)
        return result["text"].strip()

    async def transcribe_file(
        self,
        file: UploadFile,
        model_type: ModelType,
        action: ActionType,
        target_language: Optional[str] = None,
    ) -> TranscriptionResponse:
        """Transcribe uploaded audio file"""

        # Validate file type
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
        if file.filename:
            file_extension = f".{file.filename.split('.')[-1].lower()}"

        # Check content type first, then fallback to file extension
        is_valid_content_type = (
            file.content_type in settings.allowed_file_types
        )
        is_valid_extension = (
            file_extension in allowed_extensions if file_extension else False
        )

        if not (is_valid_content_type or is_valid_extension):
            supported_formats = (
                "MP3, M4A, WAV, OPUS, OGG, FLAC, AAC, WebM, MP4, 3GP, AMR"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. "
                f"Supported formats: {supported_formats}",
            )

        # Create temporary file
        file_extension = (
            f".{file.filename.split('.')[-1]}" if file.filename else ".wav"
        )
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=file_extension
        ) as temp_file:
            try:
                # Write uploaded file content to temporary file
                content = await file.read()
                temp_file.write(content)
                temp_file.flush()

                # Load model
                model = await self._get_model(model_type)

                # Transcribe using helper method
                text_result = await self._transcribe_with_model(
                    model, temp_file.name, action, target_language
                )

                return TranscriptionResponse(
                    model=model_type.value,
                    action=action.value,
                    text=text_result,
                    target_language=target_language,
                )

            except Exception as e:
                raise HTTPException(
                    status_code=500, detail=f"Transcription failed: {str(e)}"
                )
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)

    async def transcribe_realtime_chunk(
        self,
        audio_data: bytes,
        model_type: ModelType,
        action: ActionType,
        target_language: Optional[str] = None,
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
                        model, temp_file.name, action, target_language
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
