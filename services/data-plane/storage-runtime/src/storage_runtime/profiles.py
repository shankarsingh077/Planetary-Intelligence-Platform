from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class StoreProfile:
    name: str
    object_backend: str
    sql_backend: str
    object_bucket_env: str | None
    warehouse_dsn_env: str | None
    extra: dict[str, Any]


def _root() -> Path:
    return Path(__file__).resolve().parents[5]


def load_store_profile(name: str) -> StoreProfile:
    profile_file = _root() / "deploy" / "profiles" / "stores" / f"{name}.json"
    if not profile_file.exists():
        raise FileNotFoundError(f"store_profile_not_found:{name}")

    payload = json.loads(profile_file.read_text(encoding="utf-8"))
    return StoreProfile(
        name=str(payload.get("name", name)),
        object_backend=str(payload.get("object_backend", "local")),
        sql_backend=str(payload.get("sql_backend", "sqlite")),
        object_bucket_env=payload.get("object_bucket_env"),
        warehouse_dsn_env=payload.get("warehouse_dsn_env"),
        extra={k: v for k, v in payload.items() if k not in {"name", "object_backend", "sql_backend", "object_bucket_env", "warehouse_dsn_env"}},
    )
