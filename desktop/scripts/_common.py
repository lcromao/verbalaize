"""Shared helpers for desktop build/stage scripts."""

from __future__ import annotations

import platform


def detect_target_triple() -> str:
    """Return the Rust-style target triple for the current build host."""
    system = platform.system().lower()
    machine = platform.machine().lower()

    if system == "darwin":
        if machine in {"arm64", "aarch64"}:
            return "aarch64-apple-darwin"
        return "x86_64-apple-darwin"

    if system == "windows":
        return "x86_64-pc-windows-msvc"

    if system == "linux":
        return "x86_64-unknown-linux-gnu"

    raise RuntimeError(f"Unsupported build host: {system}/{machine}")
