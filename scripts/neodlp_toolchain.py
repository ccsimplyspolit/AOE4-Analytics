"""Locate the local NeoDLP install and optionally start its YouTube PO-token server."""

from __future__ import annotations

import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

POT_PING = "http://127.0.0.1:4416/ping"


def candidate_homes() -> list[Path]:
    homes: list[Path] = []
    override = os.environ.get("NEODLP_HOME", "").strip()
    if override:
        homes.append(Path(override))
    local = os.environ.get("LOCALAPPDATA", "").strip()
    if local:
        homes.append(Path(local) / "NeoDLP")
    profile = os.environ.get("USERPROFILE", "").strip()
    if profile:
        homes.append(Path(profile) / "AppData" / "Local" / "NeoDLP")
    unique: list[Path] = []
    seen: set[str] = set()
    for home in homes:
        key = str(home).lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(home)
    return unique


def resolve_neodlp_home() -> Path | None:
    for home in candidate_homes():
        if (home / "yt-dlp.exe").is_file() and (home / "ffmpeg.exe").is_file():
            return home
    return None


def prepend_path(home: Path) -> None:
    current = os.environ.get("PATH", "")
    prefix = str(home)
    if current.lower().startswith(prefix.lower()):
        return
    os.environ["PATH"] = prefix + os.pathsep + current


def apply_ytdlp_options(options: dict[str, Any], home: Path | None = None) -> dict[str, Any]:
    resolved = home or resolve_neodlp_home()
    if resolved is None:
        return options
    prepend_path(resolved)
    plugin_dir = resolved / "yt-dlp-plugins"
    merged = dict(options)
    merged.setdefault("ffmpeg_location", str(resolved))
    if plugin_dir.is_dir():
        merged.setdefault("plugin_dirs", [str(plugin_dir)])
    return merged


def is_pot_running(timeout: float = 1.5) -> bool:
    try:
        with urllib.request.urlopen(POT_PING, timeout=timeout) as response:
            return 200 <= response.status < 300
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def ensure_pot_server(home: Path | None = None) -> bool:
    if is_pot_running():
        return True
    resolved = home or resolve_neodlp_home()
    if resolved is None:
        return False
    pot = resolved / "neodlp-pot.exe"
    if not pot.is_file():
        return False
    try:
        subprocess.Popen(
            [str(pot), "server", "--host", "127.0.0.1", "--port", "4416"],
            cwd=str(resolved),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0) | getattr(subprocess, "DETACHED_PROCESS", 0),
        )
    except OSError:
        return False
    deadline = time.time() + 8
    while time.time() < deadline:
        if is_pot_running(0.8):
            return True
        time.sleep(0.4)
    return is_pot_running()
