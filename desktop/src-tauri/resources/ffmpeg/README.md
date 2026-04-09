# FFmpeg resources

This directory is populated per-platform by `desktop/scripts/stage_ffmpeg.py`.

Expected layout after staging:

- `desktop/src-tauri/resources/ffmpeg/aarch64-apple-darwin/`
- `desktop/src-tauri/resources/ffmpeg/x86_64-apple-darwin/`
- `desktop/src-tauri/resources/ffmpeg/x86_64-pc-windows-msvc/`
- `desktop/src-tauri/resources/ffmpeg/x86_64-unknown-linux-gnu/`

The staged directory must contain `ffmpeg`, `ffprobe`, and Windows DLLs when applicable.
