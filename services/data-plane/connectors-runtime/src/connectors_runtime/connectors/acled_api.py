from __future__ import annotations

import os
from datetime import timedelta
from urllib.parse import urlencode

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class ACLEDAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="acled-api",
                freshness_sla_seconds=1800,
                max_retries=2,
                backoff_base_seconds=0.75,
                circuit_breaker_threshold=4,
                circuit_breaker_reset_seconds=45,
            ),
            topic="signals.acled.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def _build_endpoint(self) -> tuple[str, bool, dict[str, str] | None]:
        endpoint = os.getenv("ACLED_API_ENDPOINT", "https://api.acleddata.com/acled/read").strip()
        email = os.getenv("ACLED_EMAIL", "").strip()
        access_key = os.getenv("ACLED_ACCESS_KEY", "").strip() or os.getenv("ACLED_ACCESS_TOKEN", "").strip()
        limit = os.getenv("ACLED_LIMIT", "20").strip()
        bearer_token = os.getenv("ACLED_BEARER_TOKEN", "").strip() or os.getenv("ACLED_ACCESS_TOKEN", "").strip()

        if bearer_token:
            return endpoint, True, {"Authorization": f"Bearer {bearer_token}"}

        if not email or not access_key:
            return endpoint, False, None

        query = urlencode(
            {
                "email": email,
                "key": access_key,
                "limit": limit,
            }
        )
        return f"{endpoint}?{query}", True, None

    def fetch(self) -> ConnectorResult:
        now = utcnow()
        endpoint, has_credentials, headers = self._build_endpoint()

        records: list[dict[str, object]] = []
        try:
            if has_credentials:
                payload = fetch_json(endpoint, headers=headers)
                rows = payload.get("data", []) if isinstance(payload, dict) else []
                for row in rows:
                    if not isinstance(row, dict):
                        continue

                    lat_text = row.get("latitude")
                    lon_text = row.get("longitude")
                    location = None
                    try:
                        lat = float(str(lat_text))
                        lon = float(str(lon_text))
                        location = {"geo": {"lat": lat, "lon": lon}, "label": row.get("country", "acled")}
                    except Exception:  # noqa: BLE001
                        location = None

                    record: dict[str, object] = {
                        "domain": "acled",
                        "headline": row.get("event_type", "conflict_event"),
                        "title": row.get("sub_event_type", "conflict_signal"),
                        "source": "acled",
                        "source_url": endpoint,
                        "country": row.get("country", "unknown"),
                        "published_at": row.get("event_date", now.isoformat()),
                        "fetched_at": now.isoformat(),
                    }
                    if location:
                        record["location"] = location
                    records.append(record)
        except Exception:  # noqa: BLE001
            records = []

        if not records:
            records = [
                {
                    "domain": "acled",
                    "headline": "No live ACLED response; using fallback conflict signal",
                    "title": "conflict_fallback",
                    "source": "acled-fallback",
                    "source_url": "sample://acled/fallback",
                    "published_at": (now - timedelta(hours=3)).isoformat(),
                    "fetched_at": now.isoformat(),
                    "credential_missing": not has_credentials,
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
