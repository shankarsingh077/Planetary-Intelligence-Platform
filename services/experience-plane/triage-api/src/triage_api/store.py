from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _parse_gcs_uri(uri: str) -> tuple[str, str]:
    if not uri.startswith("gs://"):
        raise ValueError("invalid_gcs_uri")
    trimmed = uri[len("gs://") :]
    bucket, _, prefix = trimmed.partition("/")
    if not bucket:
        raise ValueError("invalid_gcs_uri_bucket")
    return bucket, prefix.strip("/")


def _safe(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in value)[:120]


@dataclass(slots=True)
class AssignmentStore:
    audit_file: Path
    audit_gcs_uri: str | None = None
    _assignments: dict[str, dict[str, Any]] = field(default_factory=dict, init=False)

    def __post_init__(self) -> None:
        if self.audit_gcs_uri is None:
            env_uri = os.getenv("TRIAGE_AUDIT_GCS_URI", "").strip()
            self.audit_gcs_uri = env_uri or None
        self._load_from_local_audit()
        self._load_from_gcs_audit()

    def _upsert(self, payload: dict[str, Any]) -> None:
        alert_id = str(payload.get("alert_id", "")).strip()
        if alert_id:
            self._assignments[alert_id] = payload

    def _load_from_local_audit(self) -> None:
        if not self.audit_file.exists():
            return
        with self.audit_file.open("r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if not stripped:
                    continue
                try:
                    payload = json.loads(stripped)
                except Exception:  # noqa: BLE001
                    continue
                if isinstance(payload, dict):
                    self._upsert(payload)

    def _build_storage_client(self) -> Any:
        try:
            from google.cloud import storage  # type: ignore
        except Exception:  # noqa: BLE001
            return None
        try:
            return storage.Client()
        except Exception:  # noqa: BLE001
            return None

    def _load_from_gcs_audit(self, max_objects: int = 500) -> None:
        if not self.audit_gcs_uri:
            return
        try:
            bucket_name, prefix = _parse_gcs_uri(self.audit_gcs_uri)
        except ValueError:
            return

        client = self._build_storage_client()
        if client is None:
            return

        try:
            blobs = list(client.list_blobs(bucket_name, prefix=prefix))
        except Exception:  # noqa: BLE001
            return

        for blob in sorted(blobs, key=lambda item: item.name)[-max_objects:]:
            try:
                payload_text = blob.download_as_text(encoding="utf-8")
                payload = json.loads(payload_text)
            except Exception:  # noqa: BLE001
                continue
            if isinstance(payload, dict):
                self._upsert(payload)

    def _write_to_gcs(self, payload: dict[str, Any]) -> None:
        if not self.audit_gcs_uri:
            return
        try:
            bucket_name, prefix = _parse_gcs_uri(self.audit_gcs_uri)
        except ValueError:
            return

        client = self._build_storage_client()
        if client is None:
            return

        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        alert_id = _safe(str(payload.get("alert_id", "unknown")))
        key = "/".join(part for part in [prefix, "assignments", f"{ts}_{alert_id}.json"] if part)
        try:
            bucket = client.bucket(bucket_name)
            blob = bucket.blob(key)
            blob.upload_from_string(json.dumps(payload), content_type="application/json")
        except Exception:  # noqa: BLE001
            return

    def assign(self, tenant_id: str, alert_id: str, user_id: str, note: str) -> dict[str, Any]:
        payload = {
            "tenant_id": tenant_id,
            "alert_id": alert_id,
            "assigned_to": user_id,
            "note": note,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
        }
        self._upsert(payload)

        self.audit_file.parent.mkdir(parents=True, exist_ok=True)
        with self.audit_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")

        self._write_to_gcs(payload)

        return payload

    def get(self, alert_id: str) -> dict[str, Any] | None:
        return self._assignments.get(alert_id)

    def count_assignments(self) -> int:
        return len(self._assignments)
