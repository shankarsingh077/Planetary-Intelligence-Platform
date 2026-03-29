from __future__ import annotations

import os
from datetime import timedelta

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class NewsAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="news-api",
                freshness_sla_seconds=600,
                max_retries=3,
                backoff_base_seconds=0.5,
                circuit_breaker_threshold=4,
                circuit_breaker_reset_seconds=30,
            ),
            topic="signals.news.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()
        endpoint = os.getenv("NEWS_API_ENDPOINT", "").strip()

        if endpoint:
            payload = fetch_json(endpoint)
            items = payload.get("items", []) if isinstance(payload, dict) else []
            records = [
                {
                    "domain": "news",
                    "headline": item.get("title", "unknown"),
                    "source_url": item.get("url", ""),
                    "published_at": item.get("published_at", now.isoformat()),
                    "fetched_at": now.isoformat(),
                }
                for item in items
            ]
        else:
            records = [
                {
                    "domain": "news",
                    "headline": "Shipping lane congestion increased across a strategic corridor",
                    "source_url": "sample://news/local",
                    "published_at": (now - timedelta(minutes=4)).isoformat(),
                    "fetched_at": now.isoformat(),
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
