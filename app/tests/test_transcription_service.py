import asyncio
import os
from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app.schemas.transcription import ActionType, ModelType
from app.services.whisper_service import WhisperService


def build_upload_file(
    filename: str,
    content_type: str,
    content: bytes = b"audio-bytes" * 256,
) -> UploadFile:
    return UploadFile(
        filename=filename,
        file=BytesIO(content),
        headers=Headers({"content-type": content_type}),
    )


def test_transcribe_file_accepts_extension_fallback(monkeypatch):
    service = WhisperService()
    observed = {}

    async def fake_get_model(_model_type):
        return object()

    async def fake_transcribe_with_model(
        model, file_path, action, target_language=None
    ):
        observed["file_path"] = file_path
        assert os.path.exists(file_path)
        assert action == ActionType.TRANSCRIBE
        assert target_language is None
        return "texto transcrito"

    monkeypatch.setattr(service, "_get_model", fake_get_model)
    monkeypatch.setattr(
        service, "_transcribe_with_model", fake_transcribe_with_model
    )

    response = asyncio.run(
        service.transcribe_file(
            file=build_upload_file("sample.opus", "application/x-unknown"),
            model_type=ModelType.TURBO,
            action=ActionType.TRANSCRIBE,
        )
    )

    assert response.text == "texto transcrito"
    assert response.model == "turbo"
    assert not os.path.exists(observed["file_path"])


def test_transcribe_file_rejects_invalid_type():
    service = WhisperService()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            service.transcribe_file(
                file=build_upload_file("notes.txt", "text/plain"),
                model_type=ModelType.SMALL,
                action=ActionType.TRANSCRIBE,
            )
        )

    assert exc_info.value.status_code == 400
    assert "Unsupported file type" in exc_info.value.detail


def test_transcribe_file_cleans_up_temp_file_on_failure(monkeypatch):
    service = WhisperService()
    observed = {}

    async def fake_get_model(_model_type):
        return object()

    async def fake_transcribe_with_model(
        model, file_path, action, target_language=None
    ):
        observed["file_path"] = file_path
        raise RuntimeError("transcription failed")

    monkeypatch.setattr(service, "_get_model", fake_get_model)
    monkeypatch.setattr(
        service, "_transcribe_with_model", fake_transcribe_with_model
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            service.transcribe_file(
                file=build_upload_file("sample.wav", "audio/wav"),
                model_type=ModelType.SMALL,
                action=ActionType.TRANSCRIBE,
            )
        )

    assert exc_info.value.status_code == 500
    assert "Transcription failed" in exc_info.value.detail
    assert not os.path.exists(observed["file_path"])


def test_transcribe_realtime_chunk_ignores_tiny_audio():
    service = WhisperService()

    result = asyncio.run(
        service.transcribe_realtime_chunk(
            audio_data=b"tiny",
            model_type=ModelType.SMALL,
            action=ActionType.TRANSCRIBE,
        )
    )

    assert result == ""
