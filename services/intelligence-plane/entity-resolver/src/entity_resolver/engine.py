from __future__ import annotations

from typing import Any


ALIASES: dict[str, list[str]] = {
    "ent_markets": ["markets", "financial-markets", "global-markets"],
    "ent_mobility": ["mobility", "transport", "logistics"],
    "ent_news": ["news", "media"],
    "ent_regulation": ["regulation", "policy", "compliance"],
}


def _normalize(value: str) -> str:
    return "".join(ch for ch in value.lower().strip().replace("-", "_") if ch.isalnum() or ch == "_")


def _canonical_entity_id(entity_id: str) -> str:
    normalized = _normalize(entity_id)
    if normalized.startswith("ent_"):
        return normalized
    return f"ent_{normalized}"


def resolve_event_entities(event: dict[str, Any]) -> dict[str, Any]:
    resolved = dict(event)
    entities = list(resolved.get("entities", []))

    resolved_entities: list[dict[str, Any]] = []
    for item in entities:
        original_id = str(item.get("entity_id", "unknown"))
        canonical_id = _canonical_entity_id(original_id)
        aliases = ALIASES.get(canonical_id, [canonical_id.replace("ent_", "")])

        base_confidence = float(item.get("confidence", 0.5))
        confidence_boost = 0.08 if canonical_id in ALIASES else 0.0

        resolved_entities.append(
            {
                "entity_id": canonical_id,
                "role": item.get("role", "subject"),
                "aliases": aliases,
                "display_name": aliases[0],
                "organization_hierarchy": {
                    "parent_entity_id": None,
                    "subsidiary_entity_ids": [],
                },
                "confidence": max(min(base_confidence + confidence_boost, 1.0), 0.0),
            }
        )

    resolved["resolved_entities"] = resolved_entities
    return resolved
