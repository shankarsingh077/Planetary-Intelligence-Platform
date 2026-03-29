from __future__ import annotations

import os

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class MarketAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="market-api",
                freshness_sla_seconds=120,
                max_retries=3,
                backoff_base_seconds=0.25,
                circuit_breaker_threshold=5,
                circuit_breaker_reset_seconds=20,
            ),
            topic="signals.markets.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()
        endpoint = os.getenv("MARKET_API_ENDPOINT", "").strip()

        if endpoint:
            payload = fetch_json(endpoint)
            ticks = payload.get("ticks", []) if isinstance(payload, dict) else []
            records = [
                {
                    "domain": "markets",
                    "symbol": tick.get("symbol", "UNKNOWN"),
                    "price": tick.get("price", 0.0),
                    "change_pct": tick.get("change_pct", 0.0),
                    "timestamp": tick.get("timestamp", now.isoformat()),
                    "fetched_at": now.isoformat(),
                }
                for tick in ticks
            ]
        else:
            records = [
                {
                    "domain": "markets",
                    "symbol": "OIL-BRENT",
                    "price": 87.42,
                    "change_pct": 3.1,
                    "timestamp": now.isoformat(),
                    "fetched_at": now.isoformat(),
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
