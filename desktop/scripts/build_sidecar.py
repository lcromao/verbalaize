from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from _common import detect_target_triple


ROOT = Path(__file__).resolve().parents[2]
BUILD_DIST = ROOT / "build" / "pyinstaller-dist"
BUILD_WORK = ROOT / "build" / "pyinstaller-work"
SPEC_PATH = ROOT / "pyinstaller" / "verbalaize-backend.spec"
DEST_DIR = ROOT / "desktop" / "src-tauri" / "binaries"


def output_binary_name(target_triple: str) -> str:
    suffix = ".exe" if "windows" in target_triple else ""
    return f"verbalaize-backend-{target_triple}{suffix}"


def main() -> int:
    target_triple = detect_target_triple()
    suffix = ".exe" if "windows" in target_triple else ""

    if shutil.which("pyinstaller") is None:
        raise SystemExit("PyInstaller not found on PATH")

    BUILD_DIST.mkdir(parents=True, exist_ok=True)
    BUILD_WORK.mkdir(parents=True, exist_ok=True)
    DEST_DIR.mkdir(parents=True, exist_ok=True)

    subprocess.run(
        [
            "pyinstaller",
            "--noconfirm",
            "--clean",
            "--distpath",
            str(BUILD_DIST),
            "--workpath",
            str(BUILD_WORK),
            str(SPEC_PATH),
        ],
        cwd=ROOT,
        check=True,
    )

    built_binary = BUILD_DIST / f"verbalaize-backend{suffix}"
    if not built_binary.exists():
        raise SystemExit(f"Expected built binary at {built_binary}")

    destination = DEST_DIR / output_binary_name(target_triple)
    shutil.copy2(built_binary, destination)
    destination.chmod(0o755)
    print(f"Prepared sidecar: {destination}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
