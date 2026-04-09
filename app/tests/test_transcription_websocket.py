import json

from app.routes import transcription as transcription_routes


def test_websocket_acknowledges_configuration(client):
    with client.websocket_connect("/api/v1/transcribe/realtime") as websocket:
        websocket.send_text(
            json.dumps(
                {
                    "type": "config",
                    "model": "turbo",
                    "action": "transcribe",
                }
            )
        )

        response = websocket.receive_json()

    assert response["type"] == "config_ack"


def test_websocket_rejects_invalid_json(client):
    with client.websocket_connect("/api/v1/transcribe/realtime") as websocket:
        websocket.send_text("{invalid-json")
        response = websocket.receive_json()

    assert response["type"] == "error"
    assert response["message"] == "Invalid JSON configuration"


def test_websocket_rejects_unsupported_action(client):
    with client.websocket_connect("/api/v1/transcribe/realtime") as websocket:
        websocket.send_text(
            json.dumps(
                {
                    "type": "config",
                    "model": "turbo",
                    "action": "translate_language",
                }
            )
        )
        response = websocket.receive_json()

    assert response["type"] == "error"
    assert (
        response["message"]
        == "Invalid configuration: Unsupported action: "
        "translate_language. Available actions: transcribe, "
        "translate_english"
    )


def test_websocket_rejects_turbo_translation_configuration(client):
    with client.websocket_connect("/api/v1/transcribe/realtime") as websocket:
        websocket.send_text(
            json.dumps(
                {
                    "type": "config",
                    "model": "turbo",
                    "action": "translate_english",
                }
            )
        )
        response = websocket.receive_json()

    assert response["type"] == "error"
    assert (
        response["message"]
        == "Invalid configuration: The 'turbo' model does not support "
        "translation to English. Use the 'small' or 'medium' model instead."
    )


def test_websocket_transcribes_after_two_chunks(
    client, monkeypatch, sample_audio_bytes
):
    async def fake_transcribe_realtime_chunk(audio_data, model_type, action):
        assert len(audio_data) >= len(sample_audio_bytes) * 2
        assert model_type.value == "medium"
        assert action.value == "transcribe"
        return "segmento concluido"

    monkeypatch.setattr(
        transcription_routes.whisper_service,
        "transcribe_realtime_chunk",
        fake_transcribe_realtime_chunk,
    )

    with client.websocket_connect("/api/v1/transcribe/realtime") as websocket:
        websocket.send_text(
            json.dumps({"type": "config", "model": "medium", "action": "transcribe"})
        )
        assert websocket.receive_json()["type"] == "config_ack"

        websocket.send_bytes(sample_audio_bytes)
        websocket.send_bytes(sample_audio_bytes)
        response = websocket.receive_json()

    assert response["text"] == "segmento concluido"
    assert response["is_partial"] is False
    assert response["is_final_segment"] is False


def test_websocket_flushes_remaining_audio(
    client, monkeypatch, sample_audio_bytes
):
    async def fake_transcribe_realtime_chunk(audio_data, model_type, action):
        assert len(audio_data) >= len(sample_audio_bytes)
        return "segmento final"

    monkeypatch.setattr(
        transcription_routes.whisper_service,
        "transcribe_realtime_chunk",
        fake_transcribe_realtime_chunk,
    )

    with client.websocket_connect("/api/v1/transcribe/realtime") as websocket:
        websocket.send_text(
            json.dumps({"type": "config", "model": "turbo", "action": "transcribe"})
        )
        assert websocket.receive_json()["type"] == "config_ack"

        websocket.send_bytes(sample_audio_bytes)
        websocket.send_text(json.dumps({"type": "flush"}))

        final_segment = websocket.receive_json()
        done_signal = websocket.receive_json()

    assert final_segment["text"] == "segmento final"
    assert final_segment["is_final_segment"] is True
    assert done_signal["type"] == "done"
