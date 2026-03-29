from __future__ import annotations

import importlib
import json
import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


class TestTenantIsolationIntegration(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        tmp_root = Path(self.temp_dir.name)
        self.events_file = tmp_root / "events.enriched.jsonl"
        self.audit_file = tmp_root / "audit.assignments.jsonl"

        event = {
            "event_id": "evt_test",
            "event_type": "volatility_spike",
            "entities": [{"entity_id": "ent_markets", "role": "subject", "confidence": 0.7}],
            "impact": {"dimensions": [{"name": "financial", "score": 0.8}]},
            "confidence": 0.7,
            "uncertainty": {"score": 0.3, "factors": []},
            "evidence_refs": ["clm_t"],
            "source_attribution": [{"source_id": "src_t", "claim_ids": ["clm_t"]}],
            "causality_links": [],
            "created_at": "2026-03-29T10:00:00+00:00",
        }
        self.events_file.write_text(json.dumps(event) + "\n", encoding="utf-8")

        os.environ["TRIAGE_EVENTS_FILE"] = str(self.events_file)
        os.environ["TRIAGE_AUDIT_FILE"] = str(self.audit_file)

        app_module = importlib.import_module("triage_api.app")
        app_module = importlib.reload(app_module)
        self.client = TestClient(app_module.app)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_assignment_not_visible_cross_tenant(self) -> None:
        assign = self.client.post(
            "/v1/alerts/alr_evt_test/assign",
            headers={"X-Tenant-ID": "tenant-a", "X-User-ID": "user-a", "X-Roles": "analyst"},
            json={"assigneeUserId": "user-a", "note": "owned by tenant-a"},
        )
        self.assertEqual(assign.status_code, 200)

        tenant_a_alerts = self.client.get(
            "/v1/alerts",
            headers={"X-Tenant-ID": "tenant-a", "X-User-ID": "user-a", "X-Roles": "analyst"},
        )
        self.assertEqual(tenant_a_alerts.status_code, 200)
        self.assertIn("assignment", tenant_a_alerts.json()["alerts"][0])

        tenant_b_alerts = self.client.get(
            "/v1/alerts",
            headers={"X-Tenant-ID": "tenant-b", "X-User-ID": "user-b", "X-Roles": "analyst"},
        )
        self.assertEqual(tenant_b_alerts.status_code, 200)
        self.assertNotIn("assignment", tenant_b_alerts.json()["alerts"][0])


if __name__ == "__main__":
    unittest.main()
