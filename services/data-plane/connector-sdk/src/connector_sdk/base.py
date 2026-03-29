from __future__ import annotations

import time
from abc import ABC, abstractmethod
from datetime import timedelta
from typing import Any

from .models import ConnectorConfig, ConnectorResult, ConnectorStats, HealthStatus, utcnow
from .reliability import CircuitBreaker, compute_backoff_seconds, quality_score


class BaseConnector(ABC):
    def __init__(self, config: ConnectorConfig) -> None:
        self.config = config
        self.stats = ConnectorStats()
        self.circuit_breaker = CircuitBreaker(
            threshold=config.circuit_breaker_threshold,
            reset_after=timedelta(seconds=config.circuit_breaker_reset_seconds),
        )

    @abstractmethod
    def fetch(self) -> ConnectorResult:
        """Fetch records from the source system."""

    def to_records(self, result: ConnectorResult) -> list[dict[str, Any]]:
        return result.records

    def publish(self, records: list[dict[str, Any]]) -> None:
        """Publish to stream backbone. Override in runtime integration."""

    def send_to_dlq(self, payload: dict[str, Any], reason: str) -> None:
        """Dead-letter output hook. Override in runtime integration."""
        _ = payload
        _ = reason
        self.stats.dlq_count += 1

    def run_once(self) -> HealthStatus:
        now = utcnow()
        self.stats.total_runs += 1

        if not self.circuit_breaker.can_attempt(now):
            fresh = self.stats.is_fresh(now, self.config.freshness_sla_seconds)
            return HealthStatus(
                connector_id=self.config.connector_id,
                heartbeat_at=now,
                fresh=fresh,
                freshness_lag_seconds=self.stats.freshness_lag(now),
                retry_count=0,
                circuit_state=self.circuit_breaker.state,
                dlq_count=self.stats.dlq_count,
                quality_score=quality_score(
                    self.stats.successful_runs,
                    self.stats.total_runs,
                    fresh,
                    self.stats.dlq_count,
                ),
                metadata={"reason": "circuit_open"},
            )

        retry_count = 0
        while retry_count <= self.config.max_retries:
            try:
                result = self.fetch()
                records = self.to_records(result)
                self.publish(records)

                self.stats.successful_runs += 1
                self.stats.last_success_at = result.fetched_at
                self.stats.consecutive_failures = 0
                self.circuit_breaker.record_success()

                fresh = self.stats.is_fresh(now, self.config.freshness_sla_seconds)
                return HealthStatus(
                    connector_id=self.config.connector_id,
                    heartbeat_at=now,
                    fresh=fresh,
                    freshness_lag_seconds=self.stats.freshness_lag(now),
                    retry_count=retry_count,
                    circuit_state=self.circuit_breaker.state,
                    dlq_count=self.stats.dlq_count,
                    quality_score=quality_score(
                        self.stats.successful_runs,
                        self.stats.total_runs,
                        fresh,
                        self.stats.dlq_count,
                    ),
                    metadata={"records_published": len(records)},
                )
            except Exception as exc:  # noqa: BLE001
                retry_count += 1
                self.stats.consecutive_failures += 1
                self.circuit_breaker.record_failure(utcnow())

                if retry_count > self.config.max_retries:
                    self.send_to_dlq(
                        payload={"connector_id": self.config.connector_id},
                        reason=f"max_retries_exhausted:{type(exc).__name__}",
                    )
                    break

                wait_seconds = compute_backoff_seconds(self.config.backoff_base_seconds, retry_count)
                time.sleep(wait_seconds)

        fresh = self.stats.is_fresh(now, self.config.freshness_sla_seconds)
        return HealthStatus(
            connector_id=self.config.connector_id,
            heartbeat_at=now,
            fresh=fresh,
            freshness_lag_seconds=self.stats.freshness_lag(now),
            retry_count=retry_count,
            circuit_state=self.circuit_breaker.state,
            dlq_count=self.stats.dlq_count,
            quality_score=quality_score(
                self.stats.successful_runs,
                self.stats.total_runs,
                fresh,
                self.stats.dlq_count,
            ),
            metadata={"status": "failed"},
        )
