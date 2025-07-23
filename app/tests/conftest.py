import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


@pytest.fixture
def sample_audio_file():
    """Sample audio file for testing"""
    # This would be a real audio file in a production test
    return {"file": ("test.wav", b"fake audio data", "audio/wav")}
