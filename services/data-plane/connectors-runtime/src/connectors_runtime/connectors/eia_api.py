from __future__ import annotations

import os
from datetime import timedelta
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class EIAAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="eia-api",
                freshness_sla_seconds=3600,
                max_retries=2,
                backoff_base_seconds=0.75,
                circuit_breaker_threshold=4,
                circuit_breaker_reset_seconds=45,
            ),
            topic="signals.energy.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def _endpoint(self) -> tuple[str, bool]:
        endpoint = os.getenv(
            "EIA_API_ENDPOINT",
            "https://api.eia.gov/v2/petroleum/pri/gnd/data/?frequency=daily&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5",
        ).strip()
        api_key = os.getenv("EIA_API_KEY", "").strip()

        if not api_key:
            return endpoint, False

        parsed = urlsplit(endpoint)
        query_items = dict(parse_qsl(parsed.query, keep_blank_values=True))
        query_items["api_key"] = api_key
        rebuilt = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query_items), parsed.fragment))
        return rebuilt, True

    def fetch(self) -> ConnectorResult:
        now = utcnow()
        endpoint, has_key = self._endpoint()

        records: list[dict[str, object]] = []
        try:
            payload = fetch_json(endpoint)
            response = payload.get("response", {}) if isinstance(payload, dict) else {}
            data_rows = response.get("data", []) if isinstance(response, dict) else []
            for row in data_rows[:5]:
                if not isinstance(row, dict):
                    continue

                value = row.get("value")
                try:
                    price = float(str(value))
                except Exception:  # noqa: BLE001
                    continue

                period = str(row.get("period", "")).strip()
                ts = f"{period}T00:00:00+00:00" if period else now.isoformat()
                records.append(
                    {
                        "domain": "eia",
                        "headline": "EIA gasoline benchmark update",
                        "symbol": "EIA_GASOLINE",
                        "metric": row.get("product-name", "petroleum_price"),
                        "price": price,
                        "change_pct": 0.0,
                        "timestamp": ts,
                        "source": "eia",
                        "source_url": endpoint,
                        "fetched_at": now.isoformat(),
                    }
                )
        except Exception:  # noqa: BLE001
            records = []

        if not records:
            records = [
                {
                    "domain": "eia",
                    "headline": "No live EIA response; using fallback energy signal",
                    "symbol": "EIA_GASOLINE",
                    "metric": "petroleum_price",
                    "price": 2.95,
                    "change_pct": 0.0,
                    "timestamp": (now - timedelta(hours=6)).isoformat(),
                    "source": "eia-fallback",
                    "source_url": "sample://eia/fallback",
                    "fetched_at": now.isoformat(),
                    "credential_missing": not has_key,
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
