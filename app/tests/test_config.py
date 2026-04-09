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
