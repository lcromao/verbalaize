import asyncio
import json
import logging
import os
import tempfile
import time
import uuid
from typing import Optional

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from starlette.websockets import WebSocketState

from app.schemas.transcription import (
    ActionType,
    ModelType,
    RealtimeTranscriptionMessage,
    TranscriptionJobAccepted,
    TranscriptionJobStatus,
    TranscriptionResponse,
)
from app.core.config import settings
from app.services.whisper_service import whisper_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/transcribe", tags=["transcription"])
transcription_jobs: dict[str, dict] = {}

# Jobs older than this are purged automatically
_JOB_TTL_SECONDS = 3600  # 1 hour


def _cleanup_expired_jobs() -> None:
    now = time.time()
    expired = [
        jid for jid, job in transcription_jobs.items()
        if now - job.get("created_at", now) > _JOB_TTL_SECONDS
    ]
    for jid in expired:
        job = transcription_jobs.pop(jid, {})
        temp_path = job.get("temp_path")
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError:
                pass
    if expired:
        logger.info("Purged %d expired transcription job(s)", len(expired))


@router.post("/upload", response_model=TranscriptionResponse)
async def transcribe_upload(
    file: UploadFile = File(...),
    model: ModelType = Form(...),
    action: ActionType = Form(...),
):
    """
    Transcribe uploaded audio file

    - **file**: Audio file (MP3, M4A, WAV, OPUS, OGG, FLAC, AAC, WebM, MP4, 3GP, AMR)
    - **model**: Whisper model to use (small, medium, turbo)
    - **action**: Action to perform (transcribe, translate_english)
    """

    content = await file.read()
    if len(content) > settings.max_file_size:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds the {settings.max_file_size // (1024 * 1024)} MB limit",
        )
    await file.seek(0)

    try:
        result = await whisper_service.transcribe_file(
            file=file,
            model_type=model,
            action=action,
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Transcription error: %s", e)
        raise HTTPException(status_code=500, detail="Transcription failed")


@router.post("/upload/start", response_model=TranscriptionJobAccepted)
async def start_transcription_upload(
    file: UploadFile = File(...),
    model: ModelType = Form(...),
    action: ActionType = Form(...),
):
    content = await file.read()
    if len(content) > settings.max_file_size:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds the {settings.max_file_size // (1024 * 1024)} MB limit",
        )

    _cleanup_expired_jobs()

    suffix = (
        f".{file.filename.split('.')[-1]}" if file.filename else ".wav"
    )
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(content)
        temp_file.flush()
        temp_path = temp_file.name

    job_id = str(uuid.uuid4())
    transcription_jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "progress": 5,
        "stage": "queued",
        "model": model.value,
        "action": action.value,
        "text": None,
        "error": None,
        "filename": file.filename or "audio.wav",
        "content_type": file.content_type,
        "temp_path": temp_path,
        "created_at": time.time(),
    }

    asyncio.create_task(
        _run_transcription_job(
            job_id=job_id,
            model=model,
            action=action,
        )
    )

    return TranscriptionJobAccepted(
        job_id=job_id,
        status="queued",
        progress=5,
    )


@router.get("/upload/status/{job_id}", response_model=TranscriptionJobStatus)
async def get_transcription_upload_status(job_id: str):
    _cleanup_expired_jobs()
    job = transcription_jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Transcription job not found")

    return TranscriptionJobStatus(
        job_id=job["job_id"],
        status=job["status"],
        progress=job["progress"],
        stage=job["stage"],
        model=job["model"],
        action=job["action"],
        text=job["text"],
        error=job["error"],
    )


async def _run_transcription_job(
    job_id: str,
    model: ModelType,
    action: ActionType,
):
    job = transcription_jobs[job_id]
    job["status"] = "processing"
    job["progress"] = 10
    job["stage"] = "processing"

    def on_progress(progress: int, stage: str):
        current_job = transcription_jobs.get(job_id)
        if current_job is None:
            return
        current_job["progress"] = progress
        current_job["stage"] = stage

    try:
        response = await whisper_service.transcribe_file_path(
            file_path=job["temp_path"],
            filename=job["filename"],
            content_type=job["content_type"],
            model_type=model,
            action=action,
            on_progress=on_progress,
        )
        job["status"] = "completed"
        job["progress"] = 100
        job["stage"] = "completed"
        job["text"] = response.text
    except HTTPException as exc:
        job["status"] = "failed"
        job["progress"] = 100
        job["stage"] = "failed"
        job["error"] = exc.detail
    except Exception as exc:
        job["status"] = "failed"
        job["progress"] = 100
        job["stage"] = "failed"
        job["error"] = str(exc)
    finally:
        temp_path = job.get("temp_path")
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@router.websocket("/realtime")
async def transcribe_realtime(websocket: WebSocket):
    """
    Real-time transcription via WebSocket

    Expected message format from client:
    {
        "type": "config",
        "model": "medium",
        "action": "transcribe"
    }

    Then send audio chunks as binary data
    """
    client_id = str(uuid.uuid4())
    logger.info(f"WebSocket connection attempt from {client_id}")

    await websocket.accept()
    logger.info(f"WebSocket connection accepted for {client_id}")

    # Configuration variables - using lists to allow modification in nested functions
    config_state = {
        "model_type": ModelType.MEDIUM,
        "action": ActionType.TRANSCRIBE,
    }

    # Audio buffer for accumulating chunks
    audio_buffer = bytearray()
    # Process every 2 chunks or when buffer reaches certain size
    chunk_count = 0
    chunk_threshold = 2  # Process every 2 WebM chunks

    try:
        while True:
            # Receive message from client
            logger.debug(f"Waiting for message from {client_id}")
            message = await websocket.receive()
            logger.debug(
                f"Received message type: {message.get('type')} from {client_id}"
            )
            logger.debug(f"Message content keys: {list(message.keys())}")

            # Handle websocket.receive event correctly
            if message["type"] == "websocket.receive":
                if "text" in message:
                    logger.info(f"Processing text message from {client_id}")
                    await _handle_text_message(
                        websocket,
                        message,
                        config_state,
                        client_id,
                        audio_buffer,
                    )
                elif "bytes" in message:
                    logger.debug(f"Processing audio bytes from {client_id}")
                    chunk_count += 1
                    transcription = await _handle_audio_message(
                        websocket,
                        message,
                        audio_buffer,
                        chunk_count,
                        chunk_threshold,
                        config_state,
                        client_id,
                    )
                    if transcription:
                        # Reset chunk count after successful processing
                        chunk_count = 0
                else:
                    logger.warning(
                        f"Received websocket.receive without text or bytes "
                        f"from {client_id}"
                    )

            elif message["type"] == "websocket.disconnect":
                logger.info(f"Client {client_id} requested disconnect")
                break

            else:
                logger.warning(
                    f"Unknown message type: {message.get('type')} from {client_id}"
                )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {str(e)}")
        try:
            await websocket.send_json(
                {"type": "error", "message": "An unexpected error occurred"}
            )
        except Exception:
            logger.error(f"Failed to send error message to {client_id}")
    finally:
        # Process any remaining audio in buffer
        await _process_final_buffer(
            websocket, audio_buffer, config_state, client_id
        )
        logger.info(f"WebSocket connection closed for {client_id}")


async def _handle_text_message(
    websocket: WebSocket,
    message,
    config_state: dict,
    client_id: str,
    audio_buffer: Optional[bytearray] = None,
):
    """Handle text/configuration messages"""
    try:
        config = json.loads(message["text"])
        logger.info(f"Received config from {client_id}: {config}")

        if config.get("type") == "config":
            raw_model = config.get("model", "turbo")
            raw_action = config.get("action", "transcribe")

            try:
                config_state["model_type"] = ModelType(raw_model)
            except ValueError as exc:
                raise ValueError(f"Unsupported model: {raw_model}") from exc

            try:
                config_state["action"] = ActionType(raw_action)
            except ValueError as exc:
                raise ValueError(
                    "Unsupported action: "
                    f"{raw_action}. Available actions: "
                    "transcribe, translate_english"
                ) from exc

            whisper_service.validate_model_action(
                config_state["model_type"],
                config_state["action"],
            )

            logger.info(
                "Configuration updated for %s: model=%s, action=%s",
                client_id,
                config_state["model_type"],
                config_state["action"],
            )

            # Send acknowledgment
            ack_message = {
                "type": "config_ack",
                "message": "Configuration received",
            }
            logger.info(f"Sending config_ack to {client_id}: {ack_message}")
            await websocket.send_json(ack_message)
            logger.info(f"Successfully sent config_ack to {client_id}")

        elif config.get("type") == "flush":
            logger.info(f"Received flush request from {client_id}")

            # Process any remaining audio buffer
            if audio_buffer and len(audio_buffer) > 0:
                await _process_final_buffer(
                    websocket,
                    audio_buffer,
                    config_state,
                    client_id,
                    mark_final=True,
                )

            # Send done signal to client
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json({"type": "done"})
                logger.info(f"Sent flush completion signal to {client_id}")

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from {client_id}: {e}")
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json(
                {"type": "error", "message": "Invalid JSON configuration"}
            )
    except ValueError as e:
        logger.error(f"Invalid configuration values from {client_id}: {e}")
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": f"Invalid configuration: {str(e)}",
                }
            )
    except HTTPException as e:
        logger.error(f"Unsupported configuration from {client_id}: {e.detail}")
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": f"Invalid configuration: {e.detail}",
                }
            )


async def _handle_audio_message(
    websocket: WebSocket,
    message,
    audio_buffer: bytearray,
    chunk_count: int,
    chunk_threshold: int,
    config_state: dict,
    client_id: str,
):
    """Handle audio data messages"""
    audio_chunk = message["bytes"]
    logger.debug(
        f"Received {len(audio_chunk)} bytes of audio from {client_id}"
    )

    if len(audio_chunk) == 0:
        logger.warning(f"Received empty audio chunk from {client_id}")
        return None

    audio_buffer.extend(audio_chunk)

    logger.debug(
        f"Buffer status for {client_id}: {len(audio_buffer)} bytes total, "
        f"chunk {chunk_count}/{chunk_threshold}"
    )

    # Process buffer when chunk threshold is reached
    if chunk_count >= chunk_threshold:
        try:
            logger.info(
                f"Processing {len(audio_buffer)} bytes of audio "
                f"({chunk_count} chunks) for {client_id}"
            )

            # Transcribe accumulated audio
            transcription = await whisper_service.transcribe_realtime_chunk(
                audio_data=bytes(audio_buffer),
                model_type=config_state["model_type"],
                action=config_state["action"],
            )

            if transcription and transcription.strip():
                # Send completed chunk result (not partial)
                response = RealtimeTranscriptionMessage(
                    text=transcription, is_partial=False
                )

                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json(response.model_dump())
                    logger.info(
                        f"Sent transcription to {client_id}: {transcription}"
                    )
            else:
                logger.debug(f"Empty transcription result for {client_id}")

            # Clear buffer for next chunk
            audio_buffer.clear()
            return transcription

        except Exception as e:
            logger.error(f"Transcription error for {client_id}: {str(e)}")
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(
                    {"type": "error", "message": "Transcription failed"}
                )

    return None


async def _process_final_buffer(
    websocket: WebSocket,
    audio_buffer: bytearray,
    config_state: dict,
    client_id: str,
    mark_final: bool = False,
):
    """Process any remaining audio in buffer when connection closes"""
    if len(audio_buffer) > 0:
        try:
            logger.info(
                f"Processing final buffer for {client_id}: {len(audio_buffer)} bytes"
            )

            transcription = await whisper_service.transcribe_realtime_chunk(
                audio_data=bytes(audio_buffer),
                model_type=config_state["model_type"],
                action=config_state["action"],
            )

            # Only send if WebSocket is still connected
            if (
                transcription
                and transcription.strip()
                and websocket.client_state == WebSocketState.CONNECTED
            ):
                final_response = RealtimeTranscriptionMessage(
                    text=transcription,
                    is_final_segment=mark_final,
                    is_partial=not mark_final,
                )

                await websocket.send_json(final_response.model_dump())
                logger.info(
                    f"Sent final transcription to {client_id}: {transcription}"
                )
            elif websocket.client_state != WebSocketState.CONNECTED:
                logger.debug(
                    f"Skipping final transcription send - "
                    f"WebSocket not connected for {client_id}"
                )
        except Exception as e:
            logger.error(
                f"Error processing final buffer for {client_id}: {str(e)}"
            )
        finally:
            # Clear buffer after processing
            audio_buffer.clear()
