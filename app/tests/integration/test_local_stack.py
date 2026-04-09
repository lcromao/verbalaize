import os
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_ROOT = PROJECT_ROOT / "frontend"


def get_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        sock.listen(1)
        return int(sock.getsockname()[1])


def read_log(log_path: Path) -> str:
    if not log_path.exists():
        return ""

    return log_path.read_text(encoding="utf-8", errors="replace")


def wait_for_http(url: str, timeout_seconds: int) -> httpx.Response:
    deadline = time.time() + timeout_seconds
    last_error = None

    while time.time() < deadline:
        try:
            response = httpx.get(url, timeout=5.0)
            if response.status_code < 500:
                return response
        except Exception as exc:  # pragma: no cover - diagnostic path
            last_error = exc

        time.sleep(1)

    raise AssertionError(f"Timed out waiting for {url}. Last error: {last_error}")


def start_process(command, cwd: Path, env: dict[str, str]):
    log_handle = tempfile.NamedTemporaryFile(mode="w+", delete=False)
    process = subprocess.Popen(
        command,
        cwd=cwd,
        env=env,
        stdout=log_handle,
        stderr=subprocess.STDOUT,
        text=True,
    )
    return process, Path(log_handle.name), log_handle


def stop_process(process: subprocess.Popen, log_handle):
    try:
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)
    finally:
        log_handle.close()


@pytest.mark.integration
def test_frontend_proxy_uploads_real_audio(
    real_audio_path, whisper_runtime_available
):
    backend_port = get_free_port()
    frontend_port = get_free_port()

    backend_env = os.environ.copy()
    backend_env.update(
        {
            "PYTHONPATH": str(PROJECT_ROOT),
            "VBZ_HOST": "127.0.0.1",
            "VBZ_PORT": str(backend_port),
        }
    )

    frontend_env = os.environ.copy()
    frontend_env.update(
        {"VITE_API_URL": f"http://127.0.0.1:{backend_port}", "CI": "1"}
    )

    backend_process, backend_log, backend_log_handle = start_process(
        [sys.executable, "-m", "app.main"],
        cwd=PROJECT_ROOT,
        env=backend_env,
    )

    frontend_process = frontend_log = frontend_log_handle = None

    try:
        backend_health = wait_for_http(
            f"http://127.0.0.1:{backend_port}/health",
            timeout_seconds=180,
        )
        assert backend_health.status_code == 200

        frontend_process, frontend_log, frontend_log_handle = start_process(
            [
                "npm",
                "run",
                "dev",
                "--",
                "--host",
                "127.0.0.1",
                "--port",
                str(frontend_port),
            ],
            cwd=FRONTEND_ROOT,
            env=frontend_env,
        )

        frontend_root = wait_for_http(
            f"http://127.0.0.1:{frontend_port}/",
            timeout_seconds=120,
        )
        assert frontend_root.status_code == 200

        proxy_health = wait_for_http(
            f"http://127.0.0.1:{frontend_port}/health",
            timeout_seconds=30,
        )
        assert proxy_health.status_code == 200
        assert proxy_health.json()["status"] == "healthy"

        with real_audio_path.open("rb") as audio_file:
            upload_response = httpx.post(
                f"http://127.0.0.1:{frontend_port}/api/v1/transcribe/upload",
                data={"model": "turbo", "action": "transcribe"},
                files={
                    "file": (
                        real_audio_path.name,
                        audio_file,
                        "audio/ogg",
                    )
                },
                timeout=300.0,
            )

        backend_logs = read_log(backend_log)
        frontend_logs = read_log(frontend_log)

        assert upload_response.status_code == 200, (
            f"Unexpected upload status: {upload_response.status_code}\n"
            f"Backend logs:\n{backend_logs}\n\nFrontend logs:\n{frontend_logs}"
        )
        payload = upload_response.json()
        assert payload["text"].strip()
    finally:
        if frontend_process is not None:
            stop_process(frontend_process, frontend_log_handle)
        stop_process(backend_process, backend_log_handle)
