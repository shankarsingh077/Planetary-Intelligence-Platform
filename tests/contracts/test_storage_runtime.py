from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from storage_runtime.ingest_events import ingest


class TestStorageRuntime(unittest.TestCase):
    def test_ingest_persists_to_lake_and_sqlite(self) -> None:
        old_profile = os.getenv("STORE_PROFILE")
        os.environ["STORE_PROFILE"] = "local"

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            input_file = root / "events.enriched.jsonl"
            lake_dir = root / "lake"
            sqlite_file = root / "serving.db"

            event = {
                "event_id": "evt_storage_1",
                "event_type": "volatility_spike",
                "confidence": 0.7,
                "created_at": "2026-03-29T10:00:00+00:00",
                "impact": {"dimensions": [{"name": "financial", "score": 0.8}]},
            }
            input_file.write_text(json.dumps(event) + "\n", encoding="utf-8")

            count, out_file = ingest(input_file, lake_dir, sqlite_file)
            self.assertEqual(count, 1)
            self.assertTrue(out_file.exists())
            self.assertTrue(sqlite_file.exists())

        if old_profile is None:
            os.environ.pop("STORE_PROFILE", None)
        else:
            os.environ["STORE_PROFILE"] = old_profile


if __name__ == "__main__":
    unittest.main()
