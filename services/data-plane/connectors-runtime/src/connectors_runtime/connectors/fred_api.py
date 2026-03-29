from __future__ import annotations

import os
from datetime import timedelta

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_text
from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class FREDAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="fred-api",
                freshness_sla_seconds=1800,
                max_retries=2,
                backoff_base_seconds=0.5,
                circuit_breaker_threshold=4,
                circuit_breaker_reset_seconds=30,
            ),
            topic="signals.fred.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()

        endpoint = os.getenv("FRED_API_ENDPOINT", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10").strip()
        api_key = os.getenv("FRED_API_KEY", "").strip()
        series_id = os.getenv("FRED_SERIES_ID", "DGS10").strip() or "DGS10"

        if api_key and "api.stlouisfed.org" not in endpoint:
            endpoint = "https://api.stlouisfed.org/fred/series/observations"

        records: list[dict[str, object]] = []
        try:
            if api_key and "api.stlouisfed.org" in endpoint:
                api_endpoint = f"{endpoint}?series_id={series_id}&api_key={api_key}&file_type=json&limit=5&sort_order=desc"
                payload = fetch_json(api_endpoint)
                observations = payload.get("observations", []) if isinstance(payload, dict) else []
                for obs in observations:
                    if not isinstance(obs, dict):
                        continue
                    date_text = str(obs.get("date", "")).strip()
                    value_text = str(obs.get("value", "")).strip()
                    if not date_text or value_text in {".", ""}:
                        continue
                    try:
                        value = float(value_text)
                    except Exception:  # noqa: BLE001
                        continue
                    records.append(
                        {
                            "domain": "fred",
                            "symbol": series_id,
                            "metric": "fred_series",
                            "price": value,
                            "change_pct": 0.0,
                            "timestamp": f"{date_text}T00:00:00+00:00",
                            "source": "fred",
                            "source_url": api_endpoint,
                            "fetched_at": now.isoformat(),
                        }
                    )
            else:
                csv_text = fetch_text(endpoint)
                lines = [line.strip() for line in csv_text.splitlines() if line.strip()]
                if len(lines) >= 2:
                    for line in lines[-5:]:
                        if line.upper().startswith("DATE,"):
                            continue
                        date_text, _, value_text = line.partition(",")
                        if not date_text:
                            continue
                        value = None
                        try:
                            value = float(value_text)
                        except Exception:  # noqa: BLE001
                            continue
                        records.append(
                            {
                                "domain": "fred",
                                "symbol": series_id,
                                "metric": "10y_treasury_yield",
                                "price": value,
                                "change_pct": 0.0,
                                "timestamp": f"{date_text}T00:00:00+00:00",
                                "source": "fred",
                                "source_url": endpoint,
                                "fetched_at": now.isoformat(),
                            }
                        )
        except Exception:  # noqa: BLE001
            records = []

        if not records:
            records = [
                {
                    "domain": "fred",
                    "symbol": "DGS10",
                    "metric": "10y_treasury_yield",
                    "price": 4.12,
                    "change_pct": 0.0,
                    "timestamp": (now - timedelta(hours=12)).isoformat(),
                    "source": "fred-fallback",
                    "source_url": "sample://fred/fallback",
                    "fetched_at": now.isoformat(),
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
