from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def _parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _freshness_factor(created_at: str) -> float:
    try:
        age_seconds = max((datetime.now(timezone.utc) - _parse_ts(created_at)).total_seconds(), 0.0)
    except Exception:  # noqa: BLE001
        return 0.7

    if age_seconds <= 900:
        return 1.0
    if age_seconds <= 3600:
        return 0.9
    if age_seconds <= 6 * 3600:
        return 0.75
    if age_seconds <= 24 * 3600:
        return 0.6
    return 0.45


def calibrate_event_confidence(event: dict[str, Any]) -> dict[str, Any]:
    calibrated = dict(event)

    base_conf = float(calibrated.get("confidence", 0.5))
    source_attribution = list(calibrated.get("source_attribution", []))
    corroboration = max(len(source_attribution), 1)

    source_reliability = 0.72
    corroboration_boost = min(0.05 * (corroboration - 1), 0.18)
    freshness = _freshness_factor(str(calibrated.get("created_at", datetime.now(timezone.utc).isoformat())))

    fused_size = int(calibrated.get("fusion_cluster_size", 1))
    fusion_boost = min(0.03 * (fused_size - 1), 0.12)

    calibrated_score = (base_conf * 0.55) + (source_reliability * 0.20) + corroboration_boost + fusion_boost
    calibrated_score = max(min(calibrated_score * freshness, 1.0), 0.0)

    factors = [
        f"source_reliability:{source_reliability:.2f}",
        f"corroboration:{corroboration}",
        f"freshness_factor:{freshness:.2f}",
        f"fusion_cluster_size:{fused_size}",
    ]

    uncertainty = dict(calibrated.get("uncertainty", {}))
    existing_factors = list(uncertainty.get("factors", []))
    uncertainty["score"] = max(min(1.0 - calibrated_score, 1.0), 0.0)
    uncertainty["factors"] = existing_factors + factors

    calibrated["confidence"] = calibrated_score
    calibrated["uncertainty"] = uncertainty
    return calibrated
