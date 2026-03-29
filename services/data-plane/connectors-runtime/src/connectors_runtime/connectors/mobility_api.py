from __future__ import annotations

import os
from datetime import timedelta

from connector_sdk.models import ConnectorConfig, ConnectorResult, utcnow

from connectors_runtime.http_utils import fetch_json
from connectors_runtime.runtime_base import RuntimeConnector


class MobilityAPIConnector(RuntimeConnector):
    def __init__(self, publisher, dlq) -> None:
        super().__init__(
            config=ConnectorConfig(
                connector_id="mobility-api",
                freshness_sla_seconds=300,
                max_retries=3,
                backoff_base_seconds=0.5,
                circuit_breaker_threshold=4,
                circuit_breaker_reset_seconds=30,
            ),
            topic="signals.mobility.v1",
            publisher=publisher,
            dlq=dlq,
        )

    def fetch(self) -> ConnectorResult:
        now = utcnow()
        endpoint = os.getenv("MOBILITY_API_ENDPOINT", "").strip()

        if endpoint:
            payload = fetch_json(endpoint)
            incidents = payload.get("incidents", []) if isinstance(payload, dict) else []
            records = [
                {
                    "domain": "mobility",
                    "route": incident.get("route", "unknown"),
                    "status": incident.get("status", "unknown"),
                    "severity": incident.get("severity", "low"),
                    "reported_at": incident.get("reported_at", now.isoformat()),
                    "fetched_at": now.isoformat(),
                }
                for incident in incidents
            ]
        else:
            records = [
                {
                    "domain": "mobility",
                    "route": "SEA-LANE-ALPHA",
                    "status": "congested",
                    "severity": "high",
                    "reported_at": (now - timedelta(minutes=6)).isoformat(),
                    "fetched_at": now.isoformat(),
                }
            ]

        return ConnectorResult(records=records, fetched_at=now)
