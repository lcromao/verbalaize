from app.routes import transcription as transcription_routes
from app.schemas.transcription import TranscriptionResponse


def test_transcription_upload_missing_file(client):
    response = client.post("/api/v1/transcribe/upload")

    assert response.status_code == 422  # Validation error


def test_transcription_upload_invalid_action(client, sample_audio_file):
    data = {"model": "small", "action": "invalid_action"}
    response = client.post(
        "/api/v1/transcribe/upload", data=data, files=sample_audio_file
    )
    assert response.status_code == 422  # Validation error


def test_transcription_upload_requires_target_language(
    client, sample_audio_file
):
    response = client.post(
        "/api/v1/transcribe/upload",
        data={"model": "small", "action": "translate_language"},
        files=sample_audio_file,
    )

    assert response.status_code == 400
    assert "target_language is required" in response.json()["detail"]


def test_transcription_upload_success(client, monkeypatch, sample_audio_file):
    async def fake_transcribe_file(
        file, model_type, action, target_language=None
    ):
        assert file.filename == "test.wav"
        assert model_type.value == "turbo"
        assert action.value == "transcribe"
        assert target_language is None
        return TranscriptionResponse(
            model=model_type.value,
            action=action.value,
            text="teste de transcricao",
            target_language=target_language,
        )

    monkeypatch.setattr(
        transcription_routes.whisper_service,
        "transcribe_file",
        fake_transcribe_file,
    )

    response = client.post(
        "/api/v1/transcribe/upload",
        data={"model": "turbo", "action": "transcribe"},
        files=sample_audio_file,
    )

    assert response.status_code == 200
    assert response.json()["text"] == "teste de transcricao"


def test_transcription_upload_wraps_unexpected_errors(
    client, monkeypatch, sample_audio_file
):
    async def fake_transcribe_file(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(
        transcription_routes.whisper_service,
        "transcribe_file",
        fake_transcribe_file,
    )

    response = client.post(
        "/api/v1/transcribe/upload",
        data={"model": "small", "action": "transcribe"},
        files=sample_audio_file,
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "boom"
