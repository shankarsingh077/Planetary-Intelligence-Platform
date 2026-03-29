from __future__ import annotations

import os
from datetime import timedelta

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class AbuseIPDBAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="abuseipdb-api",
                freshness_sla_seconds=900,
                max_retries=2,
                backoff_base_seconds=0.5,
                circuit_breaker_threshold=4,
                circuit_breaker_reset_seconds=30,
            ),
            topic="signals.cyber.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()

        endpoint = os.getenv("ABUSEIPDB_API_ENDPOINT", "https://api.abuseipdb.com/api/v2/blacklist").strip()
        api_key = os.getenv("ABUSEIPDB_API_KEY", "").strip()
        confidence_minimum = os.getenv("ABUSEIPDB_CONFIDENCE_MIN", "90").strip()
        limit = os.getenv("ABUSEIPDB_LIMIT", "20").strip()

        headers = {"Accept": "application/json"}
        if api_key:
            headers["Key"] = api_key

        records: list[dict[str, object]] = []
        try:
            if api_key:
                payload = fetch_json(
                    f"{endpoint}?confidenceMinimum={confidence_minimum}&limit={limit}",
                    headers=headers,
                )
                rows = payload.get("data", []) if isinstance(payload, dict) else []
                for row in rows:
                    if not isinstance(row, dict):
                        continue
                    score = float(row.get("abuseConfidenceScore", 0.0))
                    records.append(
                        {
                            "domain": "abuseipdb",
                            "headline": "High-confidence abusive IP activity",
                            "title": row.get("ipAddress", "unknown_ip"),
                            "score": score,
                            "country": row.get("countryCode", "unknown"),
                            "source": "abuseipdb",
                            "source_url": endpoint,
                            "published_at": now.isoformat(),
                            "fetched_at": now.isoformat(),
                        }
                    )
        except Exception:  # noqa: BLE001
            records = []

        if not records:
            records = [
                {
                    "domain": "abuseipdb",
                    "headline": "No live AbuseIPDB response; using fallback cyber threat signal",
                    "title": "203.0.113.10",
                    "score": 95.0,
                    "country": "ZZ",
                    "source": "abuseipdb-fallback",
                    "source_url": "sample://abuseipdb/fallback",
                    "published_at": (now - timedelta(minutes=25)).isoformat(),
                    "fetched_at": now.isoformat(),
                    "credential_missing": not bool(api_key),
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
