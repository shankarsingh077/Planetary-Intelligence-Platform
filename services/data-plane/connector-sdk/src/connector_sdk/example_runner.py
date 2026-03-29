from __future__ import annotations

from datetime import timedelta

from connector_sdk.base import BaseConnector
from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow


class DemoNewsConnector(BaseConnector):
    def __init__(self) -> None:
        super().__init__(
            ConnectorConfig(
                connector_id="demo-news-rss",
                freshness_sla_seconds=600,
                max_retries=2,
                backoff_base_seconds=0.2,
                circuit_breaker_threshold=3,
                circuit_breaker_reset_seconds=5,
            )
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()
        records = [
            {
                "source": "demo-rss",
                "title": "Port congestion rises in key shipping lane",
                "published_at": (now - timedelta(minutes=2)).isoformat(),
                "domain": "mobility",
            }
        ]
        return ConnectorResult(records=records, fetched_at=now)

    def publish(self, records: list[dict]) -> None:
        print(f"published_records={len(records)}")


if __name__ == "__main__":
    connector = DemoNewsConnector()
    status = connector.run_once()
    print(status)
