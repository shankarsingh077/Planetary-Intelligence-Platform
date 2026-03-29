from __future__ import annotations

import os
from datetime import timedelta
from urllib.parse import quote_plus

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class GDELTAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="gdelt-api",
                freshness_sla_seconds=900,
                max_retries=2,
                backoff_base_seconds=0.5,
                circuit_breaker_threshold=4,
                circuit_breaker_reset_seconds=30,
            ),
            topic="signals.gdelt.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()

        query = os.getenv("GDELT_QUERY", "conflict OR sanctions OR military").strip()
        max_records = int(os.getenv("GDELT_MAX_RECORDS", "12"))
        endpoint = os.getenv("GDELT_API_ENDPOINT", "").strip()
        if not endpoint:
            endpoint = (
                "https://api.gdeltproject.org/api/v2/doc/doc?"
                f"query={quote_plus(query)}&maxrecords={max_records}&format=json&sort=datedesc"
            )

        records: list[dict[str, object]] = []
        try:
            payload = fetch_json(endpoint)
            articles = payload.get("articles", []) if isinstance(payload, dict) else []
            for article in articles:
                if not isinstance(article, dict):
                    continue
                records.append(
                    {
                        "domain": "gdelt",
                        "headline": article.get("title", "unknown"),
                        "source": article.get("sourcecountry", "gdelt"),
                        "source_url": article.get("url", ""),
                        "published_at": article.get("seendate", now.isoformat()),
                        "fetched_at": now.isoformat(),
                    }
                )
        except Exception:  # noqa: BLE001
            records = []

        if not records:
            records = [
                {
                    "domain": "gdelt",
                    "headline": "No live GDELT response; using fallback geopolitical signal",
                    "source": "gdelt-fallback",
                    "source_url": "sample://gdelt/fallback",
                    "published_at": (now - timedelta(minutes=10)).isoformat(),
                    "fetched_at": now.isoformat(),
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
