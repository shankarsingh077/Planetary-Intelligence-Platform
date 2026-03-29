from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _stable_event_id(record: dict[str, Any]) -> str:
    base = "|".join(
        [
            str(record.get("domain", "unknown")),
            str(record.get("headline") or record.get("title") or record.get("route") or "unknown"),
            str(record.get("published_at") or record.get("effective_at") or record.get("reported_at") or record.get("timestamp") or ""),
        ]
    )
    digest = hashlib.sha256(base.encode("utf-8")).hexdigest()[:16]
    return f"evt_{digest}"


def _iso_window(now: datetime) -> dict[str, str]:
    return {
        "start": (now - timedelta(minutes=30)).isoformat(),
        "end": now.isoformat(),
    }


def map_signal_record_to_event(record: dict[str, Any]) -> dict[str, Any]:
    now = _utcnow()
    event_id = _stable_event_id(record)
    domain = str(record.get("domain", "unknown"))

    event_type_by_domain = {
        "news": "policy_change",
        "regulation": "trade_rule_change",
        "markets": "volatility_spike",
        "mobility": "port_disruption",
        "gdelt": "policy_change",
        "weather": "port_disruption",
        "fred": "volatility_spike",
        "coingecko": "volatility_spike",
        "acled": "policy_change",
        "eia": "volatility_spike",
        "aviationstack": "port_disruption",
        "abuseipdb": "volatility_spike",
        "finnhub": "volatility_spike",
        "corridorrisk": "port_disruption",
    }

    source_id = str(record.get("source", record.get("source_url", "unknown-source")))
    claim_id = f"clm_{event_id}"

    return {
        "event_id": event_id,
        "revision": 1,
        "event_type": event_type_by_domain.get(domain, "policy_change"),
        "time_window": _iso_window(now),
        "temporal_confidence": 0.7,
        "location": {
            "geometry_type": "Point",
            "coordinates": [0.0, 0.0],
        },
        "entities": [
            {
                "entity_id": f"ent_{domain}",
                "role": "subject",
                "confidence": 0.6,
            }
        ],
        "evidence_refs": [claim_id],
        "confidence": 0.65,
        "uncertainty": {
            "score": 0.35,
            "factors": [
                "limited_corroboration",
                "single_source",
            ],
        },
        "impact": {
            "dimensions": [
                {"name": "operational", "score": 0.5},
                {"name": "financial", "score": 0.4},
            ]
        },
        "causality_links": [],
        "source_attribution": [
            {
                "source_id": source_id,
                "claim_ids": [claim_id],
            }
        ],
        "created_at": now.isoformat(),
    }


def transform_stream_file(input_file: Path, output_file: Path) -> None:
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with input_file.open("r", encoding="utf-8") as src, output_file.open("w", encoding="utf-8") as dst:
        for line in src:
            line = line.strip()
            if not line:
                continue
            envelope = json.loads(line)
            record = envelope.get("record", {})
            event = map_signal_record_to_event(record)
            dst.write(json.dumps(event) + "\n")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transform raw signal stream into canonical event stream")
    parser.add_argument("--input", required=True, type=Path, help="Path to raw stream jsonl file")
    parser.add_argument("--output", required=True, type=Path, help="Path to output event jsonl file")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    transform_stream_file(args.input, args.output)


if __name__ == "__main__":
    main()
