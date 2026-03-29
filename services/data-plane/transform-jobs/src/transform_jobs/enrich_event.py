from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def _score_by_event_type(event_type: str) -> tuple[float, float]:
    if event_type in {"volatility_spike", "commodity_disruption"}:
        return 0.45, 0.8
    if event_type in {"port_disruption", "conflict_incident"}:
        return 0.75, 0.55
    return 0.5, 0.45


def enrich_event(event: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(event)
    impact = dict(enriched.get("impact", {}))
    dimensions = list(impact.get("dimensions", []))

    operational_score, financial_score = _score_by_event_type(str(enriched.get("event_type", "")))

    known = {str(d.get("name")) for d in dimensions if isinstance(d, dict)}
    if "operational" not in known:
        dimensions.append({"name": "operational", "score": operational_score})
    if "financial" not in known:
        dimensions.append({"name": "financial", "score": financial_score})

    impact["dimensions"] = dimensions
    enriched["impact"] = impact

    confidence = float(enriched.get("confidence", 0.5))
    uncertainty = dict(enriched.get("uncertainty", {}))
    factors = list(uncertainty.get("factors", []))

    if confidence < 0.5 and "low_confidence_model_output" not in factors:
        factors.append("low_confidence_model_output")

    uncertainty["factors"] = factors
    enriched["uncertainty"] = uncertainty
    return enriched


def enrich_events_file(input_file: Path, output_file: Path) -> None:
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with input_file.open("r", encoding="utf-8") as src, output_file.open("w", encoding="utf-8") as dst:
        for line in src:
            line = line.strip()
            if not line:
                continue
            event = json.loads(line)
            enriched = enrich_event(event)
            dst.write(json.dumps(enriched) + "\n")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Enrich canonical event stream with default impact heuristics")
    parser.add_argument("--input", required=True, type=Path, help="Path to input event jsonl file")
    parser.add_argument("--output", required=True, type=Path, help="Path to output enriched event jsonl file")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    enrich_events_file(args.input, args.output)


if __name__ == "__main__":
    main()
