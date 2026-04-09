from app.routes import models as model_routes
from app.schemas.transcription import ModelAvailability, ModelType


def test_list_models_returns_availability(client, monkeypatch):
    def fake_list_model_availability():
        return [
            ModelAvailability(model=ModelType.SMALL, installed=True),
            ModelAvailability(model=ModelType.MEDIUM, installed=False),
            ModelAvailability(model=ModelType.TURBO, installed=False),
        ]

    monkeypatch.setattr(
        model_routes.whisper_service,
        "list_model_availability",
        fake_list_model_availability,
    )

    response = client.get("/api/v1/models")

    assert response.status_code == 200
    assert response.json()["models"] == [
        {"model": "small", "installed": True},
        {"model": "medium", "installed": False},
        {"model": "turbo", "installed": False},
    ]


def test_prepare_model_returns_job_id(client):
    response = client.post("/api/v1/models/prepare", json={"model": "small"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["job_id"]
    assert payload["status"] == "queued"
    assert payload["stage"] == "checking_cache"
    assert payload["model"] == "small"


def test_prepare_model_job_status_returns_not_found(client):
    response = client.get("/api/v1/models/jobs/missing-job")

    assert response.status_code == 404
