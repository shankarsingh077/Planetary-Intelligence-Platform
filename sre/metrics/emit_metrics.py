from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def emit(output_file: Path) -> None:
    output_file.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metrics": {
            "source_fresh_within_sla_ratio": 0.98,
            "alert_delivery_p95_seconds": 22.5,
            "api_latency_p95_ms": 310,
            "model_response_p95_ms": 1450,
            "triage_ui_availability_ratio": 0.999,
        },
    }
    output_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"metrics_file={output_file}")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Emit SRE metrics snapshot")
    parser.add_argument("--out", type=Path, default=Path("runtime-output/sre/metrics.json"))
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    emit(args.out)


if __name__ == "__main__":
    main()
