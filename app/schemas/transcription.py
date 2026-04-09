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


class TranscriptionRequest(BaseModel):
    model: ModelType
    action: ActionType


class TranscriptionResponse(BaseModel):
    model: str
    action: str
    text: str


class TranscriptionJobAccepted(BaseModel):
    job_id: str
    status: str
    progress: int


class TranscriptionJobStatus(BaseModel):
    job_id: str
    status: str
    progress: int
    stage: str
    model: str
    action: str
    text: str | None = None
    error: str | None = None


class RealtimeTranscriptionMessage(BaseModel):
    text: str
    is_partial: Optional[bool] = False
    is_final_segment: Optional[bool] = False


class ModelAvailability(BaseModel):
    model: ModelType
    installed: bool


class ModelListResponse(BaseModel):
    models: list[ModelAvailability]


class ModelPreparationRequest(BaseModel):
    model: ModelType


class ModelPreparationJobAccepted(BaseModel):
    job_id: str
    status: str
    stage: str
    model: ModelType


class ModelPreparationJobStatus(BaseModel):
    job_id: str
    status: str
    stage: str
    model: ModelType
    error: str | None = None


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
