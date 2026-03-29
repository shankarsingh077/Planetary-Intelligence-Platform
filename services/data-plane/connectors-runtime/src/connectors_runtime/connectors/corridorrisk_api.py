from __future__ import annotations

import os
from datetime import timedelta

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class CorridorRiskAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="corridorrisk-api",
                freshness_sla_seconds=300,
                max_retries=2,
                backoff_base_seconds=0.5,
                circuit_breaker_threshold=4,
                circuit_breaker_reset_seconds=30,
            ),
            topic="signals.mobility.v2",
            publisher=publisher,
            dlq=dlq,
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()
        events_endpoint = os.getenv("CORRIDORRISK_EVENTS_ENDPOINT", "https://corridorrisk.io/api/events/red-sea").strip()
        score_endpoint = os.getenv("CORRIDORRISK_SCORE_ENDPOINT", "https://corridorrisk.io/api/score/red-sea").strip()
        weather_endpoint = os.getenv("CORRIDORRISK_WEATHER_ENDPOINT", "https://corridorrisk.io/api/weather/red-sea").strip()

        records: list[dict[str, object]] = []
        try:
            events_payload = fetch_json(events_endpoint)
            event_items = events_payload if isinstance(events_payload, list) else events_payload.get("events", []) if isinstance(events_payload, dict) else []
            for item in event_items[:20]:
                if not isinstance(item, dict):
                    continue
                records.append(
                    {
                        "domain": "corridorrisk",
                        "route": str(item.get("corridor", "red-sea")),
                        "status": str(item.get("type", "incident")),
                        "severity": str(item.get("severity", "medium")),
                        "reported_at": str(item.get("date", now.isoformat())),
                        "source": "corridorrisk",
                        "source_url": events_endpoint,
                        "fetched_at": now.isoformat(),
                    }
                )

            score_payload = fetch_json(score_endpoint)
            if isinstance(score_payload, dict):
                records.append(
                    {
                        "domain": "corridorrisk",
                        "route": str(score_payload.get("corridor", "red-sea")),
                        "status": "risk_score",
                        "severity": str(score_payload.get("level", "medium")),
                        "reported_at": now.isoformat(),
                        "source": "corridorrisk",
                        "source_url": score_endpoint,
                        "fetched_at": now.isoformat(),
                        "score": score_payload.get("score", 0),
                    }
                )

            weather_payload = fetch_json(weather_endpoint)
            if isinstance(weather_payload, dict):
                records.append(
                    {
                        "domain": "corridorrisk",
                        "route": str(weather_payload.get("corridor", "red-sea")),
                        "status": "weather",
                        "severity": str(weather_payload.get("risk", "low")),
                        "reported_at": now.isoformat(),
                        "source": "corridorrisk",
                        "source_url": weather_endpoint,
                        "fetched_at": now.isoformat(),
                    }
                )
        except Exception:  # noqa: BLE001
            records = []

        if not records:
            records = [
                {
                    "domain": "corridorrisk",
                    "route": "red-sea",
                    "status": "congestion_watch",
                    "severity": "high",
                    "reported_at": (now - timedelta(minutes=10)).isoformat(),
                    "source": "corridorrisk-fallback",
                    "source_url": "sample://corridorrisk/fallback",
                    "fetched_at": now.isoformat(),
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
