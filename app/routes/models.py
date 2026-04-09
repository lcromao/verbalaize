import asyncio
import logging
import time
import uuid

from fastapi import APIRouter, HTTPException

from app.schemas.transcription import (
    ModelListResponse,
    ModelPreparationJobAccepted,
    ModelPreparationJobStatus,
    ModelPreparationRequest,
)
from app.services.whisper_service import whisper_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/models", tags=["models"])

model_jobs: dict[str, dict] = {}
_JOB_TTL_SECONDS = 3600


def _cleanup_expired_jobs() -> None:
    now = time.time()
    expired = [
        job_id
        for job_id, job in model_jobs.items()
        if now - job.get("created_at", now) > _JOB_TTL_SECONDS
    ]

    for job_id in expired:
        model_jobs.pop(job_id, None)


@router.get("", response_model=ModelListResponse)
async def list_models():
    return ModelListResponse(models=whisper_service.list_model_availability())


@router.post("/prepare", response_model=ModelPreparationJobAccepted)
async def prepare_model(request: ModelPreparationRequest):
    _cleanup_expired_jobs()

    job_id = str(uuid.uuid4())
    model_jobs[job_id] = {
        "job_id": job_id,
        "model": request.model,
        "status": "queued",
        "stage": "checking_cache",
        "error": None,
        "created_at": time.time(),
    }

    asyncio.create_task(_run_prepare_model_job(job_id, request.model))

    return ModelPreparationJobAccepted(
        job_id=job_id,
        status="queued",
        stage="checking_cache",
        model=request.model,
    )


@router.get("/jobs/{job_id}", response_model=ModelPreparationJobStatus)
async def get_prepare_model_job_status(job_id: str):
    _cleanup_expired_jobs()
    job = model_jobs.get(job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Model preparation job not found")

    return ModelPreparationJobStatus(
        job_id=job["job_id"],
        status=job["status"],
        stage=job["stage"],
        model=job["model"],
        error=job["error"],
    )


async def _run_prepare_model_job(job_id, model_type):
    job = model_jobs[job_id]
    job["status"] = "processing"

    def on_stage_change(stage: str):
        current_job = model_jobs.get(job_id)
        if current_job is None:
            return
        current_job["stage"] = stage

    try:
        await whisper_service.prepare_model(model_type, on_stage_change=on_stage_change)
        job["status"] = "completed"
        job["stage"] = "ready"
    except HTTPException as exc:
        logger.error("Model preparation failed for %s: %s", model_type.value, exc.detail)
        job["status"] = "failed"
        job["stage"] = "failed"
        job["error"] = exc.detail
    except Exception as exc:
        logger.error("Model preparation crashed for %s: %s", model_type.value, exc)
        job["status"] = "failed"
        job["stage"] = "failed"
        job["error"] = str(exc)
