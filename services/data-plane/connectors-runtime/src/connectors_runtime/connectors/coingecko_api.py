from __future__ import annotations

import os
from datetime import timedelta

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class CoinGeckoAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="coingecko-api",
                freshness_sla_seconds=180,
                max_retries=2,
                backoff_base_seconds=0.25,
                circuit_breaker_threshold=5,
                circuit_breaker_reset_seconds=20,
            ),
            topic="signals.crypto.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()

        endpoint = os.getenv(
            "COINGECKO_API_ENDPOINT",
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true",
        ).strip()

        records: list[dict[str, object]] = []
        try:
            payload = fetch_json(endpoint)
            if isinstance(payload, dict):
                for token_id, data in payload.items():
                    if not isinstance(data, dict):
                        continue
                    price = float(data.get("usd", 0.0))
                    change = float(data.get("usd_24h_change", 0.0))
                    records.append(
                        {
                            "domain": "coingecko",
                            "symbol": token_id.upper(),
                            "price": price,
                            "change_pct": change,
                            "timestamp": now.isoformat(),
                            "source": "coingecko",
                            "source_url": endpoint,
                            "fetched_at": now.isoformat(),
                        }
                    )
        except Exception:  # noqa: BLE001
            records = []

        if not records:
            records = [
                {
                    "domain": "coingecko",
                    "symbol": "BTC",
                    "price": 65000.0,
                    "change_pct": 0.0,
                    "timestamp": (now - timedelta(minutes=3)).isoformat(),
                    "source": "coingecko-fallback",
                    "source_url": "sample://coingecko/fallback",
                    "fetched_at": now.isoformat(),
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
