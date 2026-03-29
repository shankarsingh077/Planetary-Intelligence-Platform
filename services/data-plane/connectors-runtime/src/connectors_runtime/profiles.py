from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class StreamProfile:
    name: str
    backend: str
    bootstrap_env: str
    default_bootstrap: str
    healthcheck_mode: str
    extra: dict[str, Any]


def _root() -> Path:
    return Path(__file__).resolve().parents[5]


def load_stream_profile(name: str) -> StreamProfile:
    profile_file = _root() / "deploy" / "profiles" / "streams" / f"{name}.json"
    if not profile_file.exists():
        raise FileNotFoundError(f"stream_profile_not_found:{name}")

    payload = json.loads(profile_file.read_text(encoding="utf-8"))
    return StreamProfile(
        name=str(payload.get("name", name)),
        backend=str(payload.get("backend", "kafka")),
        bootstrap_env=str(payload.get("bootstrap_env", "KAFKA_BOOTSTRAP_SERVERS")),
        default_bootstrap=str(payload.get("default_bootstrap", "localhost:9092")),
        healthcheck_mode=str(payload.get("healthcheck_mode", "tcp")),
        extra={k: v for k, v in payload.items() if k not in {"name", "backend", "bootstrap_env", "default_bootstrap", "healthcheck_mode"}},
    )
