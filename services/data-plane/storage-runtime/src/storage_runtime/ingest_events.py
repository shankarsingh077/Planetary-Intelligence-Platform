from __future__ import annotations

import argparse
import json
from pathlib import Path

from .runtime import build_storage_backends, storage_health


def ingest(input_file: Path, lake_root: Path, sqlite_file: Path) -> tuple[int, Path]:
    lake, serving = build_storage_backends(lake_root=lake_root, sqlite_file=sqlite_file)

    count = 0
    last_lake_file = lake_root
    with input_file.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            event = json.loads(line)
            last_lake_file = lake.write_event(event)
            serving.upsert_event(event)
            count += 1

    return count, last_lake_file


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest enriched events into persistent stores")
    parser.add_argument("--input", required=True, type=Path, help="Input enriched events JSONL")
    parser.add_argument("--lake", required=True, type=Path, help="Object lake root directory")
    parser.add_argument("--sqlite", required=True, type=Path, help="SQLite serving store file")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    health = storage_health(args.lake, args.sqlite)
    count, out_file = ingest(args.input, args.lake, args.sqlite)
    print(f"storage_health={health}")
    print(f"ingested_events={count}")
    print(f"lake_file={out_file}")


if __name__ == "__main__":
    main()
