from __future__ import annotations

from pathlib import Path

from connectors_runtime.registry import build_connectors, stream_health


def main() -> None:
    out = Path("./runtime-output")
    health = stream_health(output_dir=out)
    print(f"stream_health={health}")

    connectors = build_connectors(output_dir=out)
    for connector in connectors:
        status = connector.run_once()
        print(
            "connector={id} fresh={fresh} lag={lag:.1f}s retries={retries} circuit={circuit} dlq={dlq} quality={quality:.2f}".format(
                id=status.connector_id,
                fresh=status.fresh,
                lag=status.freshness_lag_seconds,
                retries=status.retry_count,
                circuit=status.circuit_state,
                dlq=status.dlq_count,
                quality=status.quality_score,
            )
        )


if __name__ == "__main__":
    main()
