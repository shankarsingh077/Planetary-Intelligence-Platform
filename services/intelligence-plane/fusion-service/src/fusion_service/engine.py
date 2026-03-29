from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Any


def _parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _cluster_fingerprint(event: dict[str, Any]) -> str:
    event_type = str(event.get("event_type", "unknown"))
    entities = event.get("resolved_entities", [])
    primary_entity = "unknown"
    if entities:
        primary_entity = str(entities[0].get("entity_id", "unknown"))
    base = f"{event_type}|{primary_entity}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()[:12]


def fuse_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    clusters: dict[str, list[dict[str, Any]]] = {}

    for event in events:
        cluster_id = f"fus_{_cluster_fingerprint(event)}"
        clusters.setdefault(cluster_id, []).append(event)

    fused_events: list[dict[str, Any]] = []
    for cluster_id, members in clusters.items():
        members = sorted(members, key=lambda e: str(e.get("created_at", "")))
        member_ids = [str(m.get("event_id", "unknown")) for m in members]

        for idx, event in enumerate(members):
            fused = dict(event)
            fused["fusion_cluster_id"] = cluster_id
            fused["fusion_cluster_size"] = len(members)
            fused["fusion_cluster_members"] = member_ids

            if idx > 0:
                prev_event_id = str(members[idx - 1].get("event_id", "unknown"))
                links = list(fused.get("causality_links", []))
                links.append(
                    {
                        "relation": "precedes",
                        "target_event_id": prev_event_id,
                        "confidence": 0.55,
                    }
                )
                fused["causality_links"] = links

            fused_events.append(fused)

    return fused_events
