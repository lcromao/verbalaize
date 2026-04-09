from app.core.config import Settings


def test_settings_use_vbz_prefix(monkeypatch):
    monkeypatch.setenv("DEBUG", "release")
    monkeypatch.setenv("VBZ_DEBUG", "false")

    settings = Settings()

    assert settings.debug is False


def test_settings_expose_default_host_and_port():
    settings = Settings()

    assert settings.host == "127.0.0.1"
    assert settings.port == 8000


def test_settings_parse_desktop_cors_origins(monkeypatch):
    monkeypatch.setenv(
        "VBZ_CORS_ALLOWED_ORIGINS",
        "https://desktop.local,http://127.0.0.1:4321",
    )

    settings = Settings()

    assert settings.cors_allowed_origins == [
        "https://desktop.local",
        "http://127.0.0.1:4321",
    ]


def test_settings_include_desktop_origins(monkeypatch):
    monkeypatch.setenv("VBZ_DESKTOP_MODE", "true")

    settings = Settings()

    assert "tauri://localhost" in settings.resolved_cors_allowed_origins
    assert "http://tauri.localhost" in settings.resolved_cors_allowed_origins
