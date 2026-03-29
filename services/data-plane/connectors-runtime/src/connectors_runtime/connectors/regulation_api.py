from __future__ import annotations

import os
from datetime import timedelta

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class RegulationAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="regulation-api",
                freshness_sla_seconds=1800,
                max_retries=3,
                backoff_base_seconds=0.5,
                circuit_breaker_threshold=4,
                circuit_breaker_reset_seconds=30,
            ),
            topic="signals.regulation.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()
        endpoint = os.getenv("REGULATION_API_ENDPOINT", "").strip()

        if endpoint:
            payload = fetch_json(endpoint)
            items = payload.get("items", []) if isinstance(payload, dict) else []
            records = [
                {
                    "domain": "regulation",
                    "jurisdiction": item.get("jurisdiction", "unknown"),
                    "title": item.get("title", "untitled"),
                    "effective_at": item.get("effective_at", now.isoformat()),
                    "source_url": item.get("url", ""),
                    "fetched_at": now.isoformat(),
                }
                for item in items
            ]
        else:
            records = [
                {
                    "domain": "regulation",
                    "jurisdiction": "EU",
                    "title": "New export control guidance on dual-use components",
                    "effective_at": (now - timedelta(hours=2)).isoformat(),
                    "source_url": "sample://regulation/local",
                    "fetched_at": now.isoformat(),
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
