from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _date_partition(ts: str) -> str:
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:  # noqa: BLE001
        dt = datetime.now(timezone.utc)
    return dt.strftime("%Y-%m-%d")


@dataclass(slots=True)
class ObjectLakeWriter:
    root_dir: Path

    def write_event(self, event: dict[str, Any]) -> Path:
        partition = _date_partition(str(event.get("created_at", "")))
        out_dir = self.root_dir / f"dt={partition}"
        out_dir.mkdir(parents=True, exist_ok=True)

        out_file = out_dir / "events.jsonl"
        with out_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")
        return out_file

    def health_check(self) -> dict[str, Any]:
        return {"backend": "local", "healthy": True, "detail": str(self.root_dir)}


@dataclass(slots=True)
class CloudObjectStoreWriter:
    bucket: str
    prefix: str
    mirror_root: Path

    def write_event(self, event: dict[str, Any]) -> Path:
        partition = _date_partition(str(event.get("created_at", "")))
        out_dir = self.mirror_root / self.bucket / self.prefix / f"dt={partition}"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "events.jsonl"
        with out_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")
        return out_file

    def health_check(self) -> dict[str, Any]:
        healthy = bool(self.bucket)
        return {
            "backend": "cloud-object",
            "healthy": healthy,
            "detail": f"bucket={self.bucket} prefix={self.prefix}",
        }


@dataclass(slots=True)
class ServingStore:
    db_file: Path

    def __post_init__(self) -> None:
        self.db_file.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.db_file) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    severity TEXT NOT NULL,
                    fusion_cluster_id TEXT,
                    created_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            conn.commit()

    @staticmethod
    def _severity(event: dict[str, Any]) -> str:
        dims = event.get("impact", {}).get("dimensions", [])
        scores = [float(d.get("score", 0.0)) for d in dims if isinstance(d, dict)]
        max_score = max(scores) if scores else 0.0
        if max_score >= 0.85:
            return "critical"
        if max_score >= 0.65:
            return "high"
        if max_score >= 0.45:
            return "medium"
        return "low"

    def upsert_event(self, event: dict[str, Any]) -> None:
        with sqlite3.connect(self.db_file) as conn:
            conn.execute(
                """
                INSERT INTO events(event_id, event_type, confidence, severity, fusion_cluster_id, created_at, payload_json)
                VALUES(?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(event_id) DO UPDATE SET
                  event_type=excluded.event_type,
                  confidence=excluded.confidence,
                  severity=excluded.severity,
                  fusion_cluster_id=excluded.fusion_cluster_id,
                  created_at=excluded.created_at,
                  payload_json=excluded.payload_json
                """,
                (
                    str(event.get("event_id", "")),
                    str(event.get("event_type", "unknown")),
                    float(event.get("confidence", 0.0)),
                    self._severity(event),
                    str(event.get("fusion_cluster_id", "")),
                    str(event.get("created_at", "")),
                    json.dumps(event),
                ),
            )
            conn.commit()

    def count_events(self) -> int:
        with sqlite3.connect(self.db_file) as conn:
            row = conn.execute("SELECT COUNT(*) FROM events").fetchone()
        return int(row[0] if row else 0)

    def health_check(self) -> dict[str, Any]:
        return {"backend": "sqlite", "healthy": True, "detail": str(self.db_file)}


@dataclass(slots=True)
class WarehouseServingStore:
    dsn: str
    mirror_file: Path
    _index: dict[str, dict[str, Any]] = field(default_factory=dict, init=False)

    def __post_init__(self) -> None:
        self.mirror_file.parent.mkdir(parents=True, exist_ok=True)
        return

    def upsert_event(self, event: dict[str, Any]) -> None:
        event_id = str(event.get("event_id", ""))
        self._index[event_id] = event
        with self.mirror_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps({"dsn": self.dsn, "event_id": event_id, "event": event}) + "\n")

    def count_events(self) -> int:
        return len(self._index)

    def health_check(self) -> dict[str, Any]:
        healthy = bool(self.dsn)
        return {"backend": "warehouse", "healthy": healthy, "detail": self.dsn}
