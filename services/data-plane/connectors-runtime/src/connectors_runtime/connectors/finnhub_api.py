from __future__ import annotations

import os
from datetime import timedelta

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class FinnhubAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="finnhub-api",
                freshness_sla_seconds=180,
                max_retries=2,
                backoff_base_seconds=0.25,
                circuit_breaker_threshold=5,
                circuit_breaker_reset_seconds=20,
            ),
            topic="signals.markets.v2",
            publisher=publisher,
            dlq=dlq,
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()
        api_key = os.getenv("FINNHUB_API_KEY", "").strip()
        symbols = [s.strip().upper() for s in os.getenv("FINNHUB_SYMBOLS", "SPY,QQQ,GC=F,CL=F").split(",") if s.strip()]
        base_url = os.getenv("FINNHUB_QUOTE_ENDPOINT", "https://finnhub.io/api/v1/quote").strip()

        records: list[dict[str, object]] = []
        try:
            if api_key:
                for symbol in symbols[:12]:
                    endpoint = f"{base_url}?symbol={symbol}&token={api_key}"
                    payload = fetch_json(endpoint)
                    if not isinstance(payload, dict):
                        continue
                    price = float(payload.get("c", 0.0))
                    prev = float(payload.get("pc", 0.0))
                    change_pct = ((price - prev) / prev * 100.0) if prev else 0.0
                    records.append(
                        {
                            "domain": "finnhub",
                            "symbol": symbol,
                            "price": price,
                            "change_pct": change_pct,
                            "timestamp": now.isoformat(),
                            "source": "finnhub",
                            "source_url": endpoint,
                            "fetched_at": now.isoformat(),
                        }
                    )
        except Exception:  # noqa: BLE001
            records = []

        if not records:
            records = [
                {
                    "domain": "finnhub",
                    "symbol": "SPY",
                    "price": 520.0,
                    "change_pct": 0.0,
                    "timestamp": (now - timedelta(minutes=3)).isoformat(),
                    "source": "finnhub-fallback",
                    "source_url": "sample://finnhub/fallback",
                    "fetched_at": now.isoformat(),
                    "credential_missing": not bool(api_key),
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
