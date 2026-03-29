from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from confidence_service.engine import calibrate_event_confidence
from entity_resolver.engine import resolve_event_entities
from fusion_service.engine import fuse_events


@dataclass(slots=True)
class BriefScope:
    regions: list[str]
    entities: list[str]
    domains: list[str]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _severity_from_impact(event: dict[str, Any]) -> str:
    scores = [float(item.get("score", 0.0)) for item in event.get("impact", {}).get("dimensions", [])]
    max_score = max(scores) if scores else 0.0
    if max_score >= 0.85:
        return "critical"
    if max_score >= 0.65:
        return "high"
    if max_score >= 0.45:
        return "medium"
    return "low"


def _forecast_from_event_type(event_type: str) -> str:
    mapping = {
        "volatility_spike": "Market volatility likely to persist across the next 24-48 hours.",
        "port_disruption": "Logistics delays likely to broaden along connected routes.",
        "trade_rule_change": "Compliance burden and transaction friction likely to increase.",
        "policy_change": "Second-order policy responses likely from regional stakeholders.",
    }
    return mapping.get(event_type, "Related downstream signals are likely to intensify.")


def load_enriched_events(file_path: Path) -> list[dict[str, Any]]:
    if not file_path.exists():
        return []

    events: list[dict[str, Any]] = []
    with file_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            events.append(json.loads(line))
    return events


def build_alerts(
    tenant_id: str,
    events_file: Path,
    scope: BriefScope,
    max_alerts: int = 20,
) -> list[dict[str, Any]]:
    _ = tenant_id
    events = load_enriched_events(events_file)

    resolved_events = [resolve_event_entities(event) for event in events]
    fused_events = fuse_events(resolved_events)
    calibrated_events = [calibrate_event_confidence(event) for event in fused_events]

    if scope.domains:
        domain_set = set(scope.domains)
        calibrated_events = [
            e
            for e in calibrated_events
            if str(e.get("entities", [{}])[0].get("entity_id", "")).replace("ent_", "") in domain_set
        ]

    alerts: list[dict[str, Any]] = []
    for event in calibrated_events[:max_alerts]:
        event_type = str(event.get("event_type", "unknown"))
        confidence = float(event.get("confidence", 0.5))
        uncertainty = event.get("uncertainty", {})

        drivers = [
            f"Event type: {event_type}",
            f"Confidence: {confidence:.2f}",
            f"Fusion cluster size: {event.get('fusion_cluster_size', 1)}",
        ]
        contradictions = [
            "Cross-source contradiction scan is currently limited to baseline checks.",
        ]

        alert = {
            "alert_id": f"alr_{event.get('event_id', 'unknown')}",
            "event_id": event.get("event_id"),
            "severity": _severity_from_impact(event),
            "confidence": confidence,
            "location": event.get("location"),
            "snapshot": f"{event_type} detected with {len(event.get('evidence_refs', []))} evidence references.",
            "drivers": drivers,
            "contradictions": contradictions,
            "forecast": _forecast_from_event_type(event_type),
            "recommended_actions": [
                "Assign analyst owner and open triage note.",
                "Validate top evidence sources and confidence assumptions.",
                "Trigger contingency playbook if severity is high or critical.",
            ],
            "evidence": event.get("source_attribution", []),
            "uncertainty": uncertainty,
            "created_at": event.get("created_at", _utc_now_iso()),
        }
        alerts.append(alert)

    return alerts


def generate_now_brief(
    tenant_id: str,
    user_id: str,
    scope: BriefScope,
    events_file: Path,
) -> dict[str, Any]:
    _ = user_id
    alerts = build_alerts(tenant_id=tenant_id, events_file=events_file, scope=scope, max_alerts=5)

    changed = [a["snapshot"] for a in alerts]
    why_it_matters = [
        "Cross-domain signals indicate potential impact on operations and financial posture.",
        "Confidence-weighted evidence suggests near-term escalation risk in at least one domain.",
    ]
    likely_next = [a["forecast"] for a in alerts[:3]]
    recommended_actions = [
        {
            "action": "Prioritize high-severity alerts for analyst review.",
            "rationale": "Early intervention reduces downstream risk exposure.",
            "urgency": "high",
        },
        {
            "action": "Run scenario simulation on top two alerts.",
            "rationale": "Improves decision confidence under uncertainty.",
            "urgency": "medium",
        },
    ]

    evidence_refs: list[dict[str, str]] = []
    for alert in alerts:
        for attribution in alert.get("evidence", []):
            source_id = str(attribution.get("source_id", "unknown"))
            for claim_id in attribution.get("claim_ids", []):
                evidence_refs.append({"sourceId": source_id, "claimId": str(claim_id)})

    confidence = sum(float(a.get("confidence", 0.0)) for a in alerts) / max(len(alerts), 1)
    uncertainty_score = 1.0 - confidence

    return {
        "generatedAt": _utc_now_iso(),
        "changed": changed,
        "whyItMatters": why_it_matters,
        "likelyNext": likely_next,
        "recommendedActions": recommended_actions,
        "confidence": max(min(confidence, 1.0), 0.0),
        "uncertainty": {
            "score": max(min(uncertainty_score, 1.0), 0.0),
            "factors": [
                "event-coverage-limited",
                "fusion-engine-v1",
            ],
        },
        "evidence": evidence_refs,
    }
