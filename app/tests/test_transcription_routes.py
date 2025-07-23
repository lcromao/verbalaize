def test_root_endpoint(client):
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "name" in response.json()
    assert "version" in response.json()


def test_health_endpoint(client):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_transcription_upload_missing_file(client):
    """Test upload endpoint without file"""
    response = client.post("/api/v1/transcribe/upload")
    assert response.status_code == 422  # Validation error


def test_transcription_upload_invalid_action(client, sample_audio_file):
    """Test upload endpoint with invalid action"""
    data = {"model": "small", "action": "invalid_action"}
    response = client.post(
        "/api/v1/transcribe/upload", data=data, files=sample_audio_file
    )
    assert response.status_code == 422  # Validation error


# Note: Testing actual transcription would require real audio files and models
# For integration tests, you would need to:
# 1. Have sample audio files in different formats
# 2. Mock the whisper service or use smaller test models
# 3. Test WebSocket connections with proper audio streaming
