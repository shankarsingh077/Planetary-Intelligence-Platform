from __future__ import annotations

import os
from datetime import timedelta
from urllib.parse import urlencode

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class AviationStackAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="aviationstack-api",
                freshness_sla_seconds=300,
                max_retries=2,
                backoff_base_seconds=0.5,
                circuit_breaker_threshold=4,
                circuit_breaker_reset_seconds=30,
            ),
            topic="signals.aviation.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def _build_endpoint(self) -> tuple[str, bool]:
        endpoint = os.getenv("AVIATIONSTACK_API_ENDPOINT", "https://api.aviationstack.com/v1/flights").strip()
        access_key = os.getenv("AVIATIONSTACK_API_KEY", "").strip() or os.getenv("AVIATIONSTACK_API", "").strip()
        limit = os.getenv("AVIATIONSTACK_LIMIT", "20").strip()

        if not access_key:
            return endpoint, False

        query = urlencode({"access_key": access_key, "limit": limit})
        return f"{endpoint}?{query}", True

    def fetch(self) -> ConnectorResult:
        now = utcnow()
        endpoint, has_key = self._build_endpoint()

        records: list[dict[str, object]] = []
        try:
            if has_key:
                payload = fetch_json(endpoint)
                flights = payload.get("data", []) if isinstance(payload, dict) else []
                for flight in flights:
                    if not isinstance(flight, dict):
                        continue
                    status = str(flight.get("flight_status", "unknown"))
                    departure = flight.get("departure", {}) if isinstance(flight.get("departure"), dict) else {}
                    arrival = flight.get("arrival", {}) if isinstance(flight.get("arrival"), dict) else {}
                    route = f"{departure.get('iata', 'UNK')}-{arrival.get('iata', 'UNK')}"
                    records.append(
                        {
                            "domain": "aviationstack",
                            "headline": f"Flight status {status}",
                            "route": route,
                            "status": status,
                            "source": "aviationstack",
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
                    "domain": "aviationstack",
                    "headline": "No live AviationStack response; using fallback aviation signal",
                    "route": "FALLBACK-ROUTE",
                    "status": "unknown",
                    "source": "aviationstack-fallback",
                    "source_url": "sample://aviationstack/fallback",
                    "published_at": (now - timedelta(minutes=20)).isoformat(),
                    "fetched_at": now.isoformat(),
                    "credential_missing": not has_key,
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
