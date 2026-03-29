from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any


class CircuitState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass(slots=True)
class ConnectorConfig:
    connector_id: str
    freshness_sla_seconds: int = 300
    max_retries: int = 3
    backoff_base_seconds: float = 1.0
    circuit_breaker_threshold: int = 5
    circuit_breaker_reset_seconds: int = 60


@dataclass(slots=True)
class ConnectorResult:
    records: list[dict[str, Any]]
    fetched_at: datetime
    source_cursor: str | None = None


@dataclass(slots=True)
class HealthStatus:
    connector_id: str
    heartbeat_at: datetime
    fresh: bool
    freshness_lag_seconds: float
    retry_count: int
    circuit_state: CircuitState
    dlq_count: int
    quality_score: float
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ConnectorStats:
    last_success_at: datetime | None = None
    consecutive_failures: int = 0
    total_runs: int = 0
    successful_runs: int = 0
    dlq_count: int = 0

    def freshness_lag(self, now: datetime) -> float:
        if self.last_success_at is None:
            return float("inf")
        return max((now - self.last_success_at).total_seconds(), 0.0)

    def is_fresh(self, now: datetime, sla_seconds: int) -> bool:
        return self.freshness_lag(now) <= float(sla_seconds)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def seconds(delta: timedelta) -> float:
    return max(delta.total_seconds(), 0.0)
