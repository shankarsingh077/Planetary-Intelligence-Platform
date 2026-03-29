from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def run(mode: str, out_file: Path) -> None:
    out_file.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "mode": mode,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "scenarios": [
            {"name": "source_outage", "status": "simulated" if mode == "dry-run" else "planned"},
            {"name": "stream_lag_spike", "status": "simulated" if mode == "dry-run" else "planned"},
            {"name": "serving_store_unavailable", "status": "simulated" if mode == "dry-run" else "planned"},
            {"name": "intelligence_api_partial_failure", "status": "simulated" if mode == "dry-run" else "planned"},
        ],
    }
    out_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"chaos_report={out_file}")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run chaos readiness check")
    parser.add_argument("--mode", choices=["dry-run", "plan"], default="dry-run")
    parser.add_argument("--out", type=Path, default=Path("runtime-output/sre/chaos-report.json"))
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    run(args.mode, args.out)


if __name__ == "__main__":
    main()
