from __future__ import annotations

import importlib
import json
import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


class TestOpsCountersApi(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        tmp_root = Path(self.temp_dir.name)
        events_file = tmp_root / "events.enriched.jsonl"
        audit_file = tmp_root / "audit.assignments.jsonl"

        event = {
            "event_id": "evt_counter_1",
            "event_type": "policy_change",
            "entities": [{"entity_id": "ent_policy", "role": "subject", "confidence": 0.7}],
            "impact": {"dimensions": [{"name": "policy", "score": 0.7}]},
            "confidence": 0.7,
            "uncertainty": {"score": 0.3, "factors": []},
            "evidence_refs": ["clm_counter_1"],
            "source_attribution": [{"source_id": "src_counter", "claim_ids": ["clm_counter_1"]}],
            "causality_links": [],
            "created_at": "2026-03-29T10:00:00+00:00",
        }
        events_file.write_text(json.dumps(event) + "\n", encoding="utf-8")

        os.environ["TRIAGE_EVENTS_FILE"] = str(events_file)
        os.environ["TRIAGE_AUDIT_FILE"] = str(audit_file)
        os.environ["TRIAGE_AUTH_MODE"] = "header"

        app_module = importlib.import_module("triage_api.app")
        app_module = importlib.reload(app_module)
        self.client = TestClient(app_module.app)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_counters_endpoint_returns_expected_fields(self) -> None:
        response = self.client.get(
            "/v1/ops/counters",
            headers={"X-Tenant-ID": "tenant-demo", "X-User-ID": "user-demo", "X-Roles": "analyst"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get("authMode"), "header")
        self.assertGreaterEqual(int(payload.get("eventRecords", 0)), 1)
        self.assertGreaterEqual(int(payload.get("auditAssignments", 0)), 0)


if __name__ == "__main__":
    unittest.main()
