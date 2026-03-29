from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from .models import CircuitState


@dataclass(slots=True)
class CircuitBreaker:
    threshold: int
    reset_after: timedelta
    state: CircuitState = CircuitState.CLOSED
    failures: int = 0
    opened_at: datetime | None = None

    def can_attempt(self, now: datetime) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN and self.opened_at is not None:
            if now - self.opened_at >= self.reset_after:
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        return self.state == CircuitState.HALF_OPEN

    def record_success(self) -> None:
        self.failures = 0
        self.state = CircuitState.CLOSED
        self.opened_at = None

    def record_failure(self, now: datetime) -> None:
        self.failures += 1
        if self.failures >= self.threshold:
            self.state = CircuitState.OPEN
            self.opened_at = now


def compute_backoff_seconds(base: float, attempt: int) -> float:
    return base * (2 ** max(attempt - 1, 0))


def quality_score(successful_runs: int, total_runs: int, fresh: bool, dlq_count: int) -> float:
    if total_runs <= 0:
        return 0.0
    success_rate = successful_runs / total_runs
    freshness_bonus = 0.15 if fresh else 0.0
    dlq_penalty = min(dlq_count * 0.01, 0.2)
    return max(min(success_rate + freshness_bonus - dlq_penalty, 1.0), 0.0)
