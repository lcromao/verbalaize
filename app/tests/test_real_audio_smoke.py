import pytest


@pytest.mark.real_audio
def test_upload_real_audio_file(
    client, real_audio_path, whisper_runtime_available
):
    with real_audio_path.open("rb") as audio_file:
        response = client.post(
            "/api/v1/transcribe/upload",
            data={"model": "turbo", "action": "transcribe"},
            files={
                "file": (
                    real_audio_path.name,
                    audio_file,
                    "audio/ogg",
                )
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] == "turbo"
    assert payload["action"] == "transcribe"
    assert payload["text"].strip()
