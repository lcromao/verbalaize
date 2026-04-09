import importlib.util
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.whisper_service import whisper_service

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REAL_AUDIO_PATH = (
    PROJECT_ROOT / "WhatsApp Audio 2026-04-08 at 23.02.07.opus"
)


@pytest.fixture(autouse=True)
def stub_model_preload(request, monkeypatch):
    """Avoid loading Whisper models for fast tests."""
    if request.node.get_closest_marker("integration") or request.node.get_closest_marker(
        "real_audio"
    ):
        return

    async def fake_get_model(_model_type):
        return object()

    monkeypatch.setattr(whisper_service, "_get_model", fake_get_model)


@pytest.fixture
def client():
    """Test client fixture"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_audio_file():
    """Sample audio file for testing"""
    return {"file": ("test.wav", b"fake audio data" * 256, "audio/wav")}


@pytest.fixture
def sample_audio_bytes():
    return b"audio-bytes" * 256


@pytest.fixture
def real_audio_path():
    if not REAL_AUDIO_PATH.exists():
        pytest.skip(
            f"Expected local audio fixture at {REAL_AUDIO_PATH}, but it was not found."
        )

    return REAL_AUDIO_PATH


@pytest.fixture
def whisper_runtime_available():
    if importlib.util.find_spec("whisper") is None:
        pytest.skip(
            "Real audio smoke tests require the 'openai-whisper' package in the "
            "current Python environment."
        )
