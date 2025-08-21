import json
import logging
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
    TranscriptionResponse,
)
from app.services.whisper_service import whisper_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/transcribe", tags=["transcription"])


@router.post("/upload", response_model=TranscriptionResponse)
async def transcribe_upload(
    file: UploadFile = File(...),
    model: ModelType = Form(...),
    action: ActionType = Form(...),
    target_language: Optional[str] = Form(None),
):
    """
    Transcribe uploaded audio file

    - **file**: Audio file (MP3, M4A, WAV, OPUS, OGG, FLAC, AAC, WebM, MP4, 3GP, AMR)
    - **model**: Whisper model to use (small, medium, turbo)
    - **action**: Action to perform (transcribe, translate_english, translate_language)
    - **target_language**: Target language code (required for translate_language)
    """

    if action == ActionType.TRANSLATE_LANGUAGE and not target_language:
        raise HTTPException(
            status_code=400,
            detail="target_language is required when action is translate_language",
        )

    try:
        result = await whisper_service.transcribe_file(
            file=file,
            model_type=model,
            action=action,
            target_language=target_language,
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/realtime")
async def transcribe_realtime(websocket: WebSocket):
    """
    Real-time transcription via WebSocket

    Expected message format from client:
    {
        "type": "config",
        "model": "medium",
        "action": "transcribe",
        "target_language": null
    }

    Then send audio chunks as binary data
    """
    client_id = f"{id(websocket)}"
    logger.info(f"WebSocket connection attempt from {client_id}")

    await websocket.accept()
    logger.info(f"WebSocket connection accepted for {client_id}")

    # Configuration variables - using lists to allow modification in nested functions
    config_state = {
        "model_type": ModelType.MEDIUM,
        "action": ActionType.TRANSCRIBE,
        "target_language": None,
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
                {"type": "error", "message": f"WebSocket error: {str(e)}"}
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
            config_state["model_type"] = ModelType(
                config.get("model", "turbo")
            )
            config_state["action"] = ActionType(
                config.get("action", "transcribe")
            )
            config_state["target_language"] = config.get("target_language")

            logger.info(
                f"Configuration updated for {client_id}: "
                f"model={config_state['model_type']}, action={config_state['action']}, "
                f"target_language={config_state['target_language']}"
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
                target_language=config_state["target_language"],
            )

            if transcription and transcription.strip():
                # Send completed chunk result (not partial)
                response = RealtimeTranscriptionMessage(
                    text=transcription, is_partial=False
                )

                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json(response.dict())
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
                    {
                        "type": "error",
                        "message": f"Transcription error: {str(e)}",
                    }
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
                target_language=config_state["target_language"],
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

                await websocket.send_json(final_response.dict())
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
