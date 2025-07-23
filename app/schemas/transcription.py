from enum import Enum
from typing import Optional

from pydantic import BaseModel


class ModelType(str, Enum):
    SMALL = "small"
    MEDIUM = "medium"
    TURBO = "turbo"


class ActionType(str, Enum):
    TRANSCRIBE = "transcribe"
    TRANSLATE_ENGLISH = "translate_english"
    TRANSLATE_LANGUAGE = "translate_language"


class TranscriptionRequest(BaseModel):
    model: ModelType
    action: ActionType
    target_language: Optional[str] = None


class TranscriptionResponse(BaseModel):
    model: str
    action: str
    text: str
    target_language: Optional[str] = None


class RealtimeTranscriptionMessage(BaseModel):
    text: str
    is_partial: Optional[bool] = False
    is_final_segment: Optional[bool] = False


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
