from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _redis_client() -> Any | None:
    redis_url = os.getenv("TRIAGE_REDIS_URL", "").strip()
    if not redis_url:
        return None
    try:
        import redis  # type: ignore

        timeout_seconds = float(os.getenv("TRIAGE_REDIS_TIMEOUT_SECONDS", "0.25"))
        return redis.Redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=timeout_seconds,
            socket_timeout=timeout_seconds,
            retry_on_timeout=False,
        )
    except Exception:  # noqa: BLE001
        return None


def _utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")


def _sanitize(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in value)[:120]


def _parse_gcs_uri(uri: str) -> tuple[str, str]:
    if not uri.startswith("gs://"):
        raise ValueError("invalid_gcs_uri")
    trimmed = uri[len("gs://") :]
    bucket, _, key = trimmed.partition("/")
    if not bucket:
        raise ValueError("invalid_gcs_uri_bucket")
    return bucket, key.strip("/")


@dataclass(slots=True)
class EventSource:
    local_events_file: Path
    gcs_uri: str | None = None
    cache_file: Path = Path("/tmp/pip-triage-events.jsonl")
    cache_ttl_seconds: int = 30

    def _cache_key(self) -> str:
        gcs_uri = self.gcs_uri or "local"
        return f"triage:events:{_sanitize(gcs_uri)}"

    def _read_redis_cache(self) -> bool:
        client = _redis_client()
        if client is None:
            return False
        try:
            payload = client.get(self._cache_key())
            if not payload:
                return False
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            self.cache_file.write_text(str(payload), encoding="utf-8")
            return True
        except Exception:  # noqa: BLE001
            return False

    def _write_redis_cache(self) -> None:
        client = _redis_client()
        if client is None or not self.cache_file.exists():
            return
        try:
            payload = self.cache_file.read_text(encoding="utf-8")
            client.setex(self._cache_key(), self.cache_ttl_seconds, payload)
        except Exception:  # noqa: BLE001
            return

    def _build_storage_client(self) -> Any:
        try:
            from google.cloud import storage  # type: ignore
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError("google-cloud-storage is required for TRIAGE_EVENTS_GCS_URI") from exc
        return storage.Client()

    def materialize_events_file(self, max_objects: int = 400) -> Path:
        if not self.gcs_uri:
            return self.local_events_file

        if self._read_redis_cache():
            return self.cache_file

        bucket_name, prefix = _parse_gcs_uri(self.gcs_uri)
        storage_client = self._build_storage_client()
        blobs = list(storage_client.list_blobs(bucket_name, prefix=prefix))
        if not blobs:
            return self.local_events_file

        ordered = sorted(blobs, key=lambda blob: blob.name)
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)

        with self.cache_file.open("w", encoding="utf-8") as out:
            for blob in ordered[-max_objects:]:
                text = blob.download_as_text(encoding="utf-8")
                for line in text.splitlines():
                    stripped = line.strip()
                    if stripped:
                        out.write(stripped + "\n")

        self._write_redis_cache()

        return self.cache_file

    def count_records(self) -> int:
        events_file = self.materialize_events_file()
        if not events_file.exists():
            return 0
        count = 0
        with events_file.open("r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    count += 1
        return count

    def ingest_event(self, event: dict[str, Any]) -> dict[str, Any]:
        self.local_events_file.parent.mkdir(parents=True, exist_ok=True)
        with self.local_events_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")

        sink_result: dict[str, Any] = {"local": str(self.local_events_file), "gcs": None}
        if not self.gcs_uri:
            return sink_result

        bucket_name, prefix = _parse_gcs_uri(self.gcs_uri)
        storage_client = self._build_storage_client()
        bucket = storage_client.bucket(bucket_name)

        event_id = _sanitize(str(event.get("event_id", "unknown")))
        object_name = "/".join(part for part in [prefix, "ingest", f"{_utc_stamp()}_{event_id}.json"] if part)
        payload = json.dumps(event)

        blob = bucket.blob(object_name)
        blob.upload_from_string(payload, content_type="application/json")
        sink_result["gcs"] = f"gs://{bucket_name}/{object_name}"
        return sink_result


def build_event_source(default_events_file: Path) -> EventSource:
    gcs_uri = os.getenv("TRIAGE_EVENTS_GCS_URI", "").strip() or None
    cache_file = Path(os.getenv("TRIAGE_EVENTS_CACHE_FILE", "/tmp/pip-triage-events.jsonl"))
    cache_ttl_seconds = int(os.getenv("TRIAGE_REDIS_CACHE_TTL_SECONDS", "30"))
    return EventSource(
        local_events_file=default_events_file,
        gcs_uri=gcs_uri,
        cache_file=cache_file,
        cache_ttl_seconds=cache_ttl_seconds,
    )
