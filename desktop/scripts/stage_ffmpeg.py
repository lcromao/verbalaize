from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

from _common import detect_target_triple


ROOT = Path(__file__).resolve().parents[2]
DEST_ROOT = ROOT / "desktop" / "src-tauri" / "resources" / "ffmpeg"


def resolve_ffmpeg_dir() -> Path:
    configured_dir = os.environ.get("FFMPEG_BIN_DIR")
    if configured_dir:
        ffmpeg_dir = Path(configured_dir).expanduser().resolve()
        if not ffmpeg_dir.is_dir():
            raise SystemExit(f"FFMPEG_BIN_DIR does not exist: {ffmpeg_dir}")
        return ffmpeg_dir

    ffmpeg_path = shutil.which("ffmpeg")
    ffprobe_path = shutil.which("ffprobe")
    if not ffmpeg_path or not ffprobe_path:
        raise SystemExit(
            "Unable to locate ffmpeg/ffprobe. Install FFmpeg or set FFMPEG_BIN_DIR."
        )

    ffmpeg_dir = Path(ffmpeg_path).resolve().parent
    if Path(ffprobe_path).resolve().parent != ffmpeg_dir:
        raise SystemExit("ffmpeg and ffprobe must live in the same directory")

    return ffmpeg_dir


def stage_files(source_dir: Path, destination_dir: Path) -> None:
    destination_dir.mkdir(parents=True, exist_ok=True)

    executables = {"ffmpeg", "ffprobe", "ffmpeg.exe", "ffprobe.exe"}
    copied = 0

    for candidate in source_dir.iterdir():
        if candidate.name in executables or candidate.suffix.lower() == ".dll":
            destination = destination_dir / candidate.name
            shutil.copyfile(candidate, destination)
            destination.chmod(0o755 if candidate.name in executables else 0o644)
            if sys.platform == "darwin" and hasattr(os, "listxattr"):
                for attribute in os.listxattr(destination):
                    os.removexattr(destination, attribute)
            copied += 1

    if copied == 0:
        raise SystemExit(f"No FFmpeg executables found in {source_dir}")


def main() -> int:
    source_dir = resolve_ffmpeg_dir()
    target_triple = detect_target_triple()
    destination_dir = DEST_ROOT / target_triple

    if destination_dir.exists():
        shutil.rmtree(destination_dir)

    stage_files(source_dir, destination_dir)
    print(f"Staged FFmpeg resources: {destination_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
