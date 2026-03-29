from __future__ import annotations

import os
from datetime import timedelta

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class WeatherGovAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="weather-gov-api",
                freshness_sla_seconds=600,
                max_retries=2,
                backoff_base_seconds=0.5,
                circuit_breaker_threshold=4,
                circuit_breaker_reset_seconds=30,
            ),
            topic="signals.weather.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()

        endpoint = os.getenv("WEATHER_GOV_API_ENDPOINT", "https://api.weather.gov/alerts/active").strip()
        headers = {"User-Agent": "PlanetaryIntelligencePlatform/0.1 (ops@planetary-intel.local)"}

        records: list[dict[str, object]] = []
        try:
            payload = fetch_json(endpoint, headers=headers)
            features = payload.get("features", []) if isinstance(payload, dict) else []
            for feature in features:
                if not isinstance(feature, dict):
                    continue
                props = feature.get("properties", {})
                geometry = feature.get("geometry", {})
                coords = geometry.get("coordinates", []) if isinstance(geometry, dict) else []
                center = coords[0] if isinstance(coords, list) and coords else []
                lon = center[0] if isinstance(center, list) and len(center) > 1 else None
                lat = center[1] if isinstance(center, list) and len(center) > 1 else None

                record: dict[str, object] = {
                    "domain": "weather",
                    "headline": props.get("headline", "weather alert"),
                    "title": props.get("event", "weather_event"),
                    "source": "weather.gov",
                    "source_url": props.get("@id", endpoint),
                    "published_at": props.get("sent", now.isoformat()),
                    "fetched_at": now.isoformat(),
                }
                if lat is not None and lon is not None:
                    record["location"] = {"geo": {"lat": float(lat), "lon": float(lon)}, "label": "weather_alert"}
                records.append(record)
        except Exception:  # noqa: BLE001
            records = []

        if not records:
            records = [
                {
                    "domain": "weather",
                    "headline": "No live weather alert response; using fallback severe-weather signal",
                    "title": "severe_weather_watch",
                    "source": "weather-fallback",
                    "source_url": "sample://weather/fallback",
                    "published_at": (now - timedelta(minutes=8)).isoformat(),
                    "fetched_at": now.isoformat(),
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
