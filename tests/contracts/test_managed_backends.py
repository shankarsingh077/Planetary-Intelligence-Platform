from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from connectors_runtime.registry import stream_health
from storage_runtime.ingest_events import ingest
from storage_runtime.runtime import storage_health


class TestManagedBackends(unittest.TestCase):
    def test_redpanda_profile_health_dry_run(self) -> None:
        old_profile = os.getenv("STREAM_PROFILE")
        old_bootstrap = os.getenv("REDPANDA_BOOTSTRAP_SERVERS")
        old_dry = os.getenv("STREAM_DRY_RUN")

        os.environ["STREAM_PROFILE"] = "redpanda"
        os.environ["REDPANDA_BOOTSTRAP_SERVERS"] = "redpanda.local:9092"
        os.environ["STREAM_DRY_RUN"] = "1"

        try:
            health = stream_health(Path("./runtime-output"))
            self.assertTrue(bool(health.get("healthy")))
            self.assertEqual(str(health.get("backend")), "redpanda")
        finally:
            if old_profile is None:
                os.environ.pop("STREAM_PROFILE", None)
            else:
                os.environ["STREAM_PROFILE"] = old_profile
            if old_bootstrap is None:
                os.environ.pop("REDPANDA_BOOTSTRAP_SERVERS", None)
            else:
                os.environ["REDPANDA_BOOTSTRAP_SERVERS"] = old_bootstrap
            if old_dry is None:
                os.environ.pop("STREAM_DRY_RUN", None)
            else:
                os.environ["STREAM_DRY_RUN"] = old_dry

    def test_cloud_store_profile_ingest(self) -> None:
        old_profile = os.getenv("STORE_PROFILE")
        old_bucket = os.getenv("OBJECT_STORE_BUCKET")
        old_dsn = os.getenv("WAREHOUSE_DSN")
        old_mirror = os.getenv("CLOUD_MIRROR_DIR")
        old_wh = os.getenv("WAREHOUSE_MIRROR_FILE")

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            input_file = root / "events.enriched.jsonl"
            input_event = {
                "event_id": "evt_managed_1",
                "event_type": "policy_change",
                "confidence": 0.64,
                "created_at": "2026-03-29T10:00:00+00:00",
                "impact": {"dimensions": [{"name": "operational", "score": 0.7}]},
            }
            input_file.write_text(json.dumps(input_event) + "\n", encoding="utf-8")

            os.environ["STORE_PROFILE"] = "cloud"
            os.environ["OBJECT_STORE_BUCKET"] = "pip-test-bucket"
            os.environ["WAREHOUSE_DSN"] = "warehouse://demo"
            os.environ["CLOUD_MIRROR_DIR"] = str(root / "cloud-sync")
            os.environ["WAREHOUSE_MIRROR_FILE"] = str(root / "warehouse.jsonl")

            try:
                health = storage_health(root / "unused-lake", root / "unused.db")
                self.assertTrue(bool(health["object_store"]["healthy"]))
                self.assertTrue(bool(health["serving_store"]["healthy"]))

                count, out_file = ingest(input_file, root / "unused-lake", root / "unused.db")
                self.assertEqual(count, 1)
                self.assertTrue(out_file.exists())
                self.assertTrue((root / "warehouse.jsonl").exists())
            finally:
                if old_profile is None:
                    os.environ.pop("STORE_PROFILE", None)
                else:
                    os.environ["STORE_PROFILE"] = old_profile
                if old_bucket is None:
                    os.environ.pop("OBJECT_STORE_BUCKET", None)
                else:
                    os.environ["OBJECT_STORE_BUCKET"] = old_bucket
                if old_dsn is None:
                    os.environ.pop("WAREHOUSE_DSN", None)
                else:
                    os.environ["WAREHOUSE_DSN"] = old_dsn
                if old_mirror is None:
                    os.environ.pop("CLOUD_MIRROR_DIR", None)
                else:
                    os.environ["CLOUD_MIRROR_DIR"] = old_mirror
                if old_wh is None:
                    os.environ.pop("WAREHOUSE_MIRROR_FILE", None)
                else:
                    os.environ["WAREHOUSE_MIRROR_FILE"] = old_wh


if __name__ == "__main__":
    unittest.main()
