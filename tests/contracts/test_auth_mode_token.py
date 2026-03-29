from __future__ import annotations

import importlib
import json
import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


class TestAuthModeToken(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        tmp_root = Path(self.temp_dir.name)
        events_file = tmp_root / "events.enriched.jsonl"
        audit_file = tmp_root / "audit.assignments.jsonl"

        event = {
            "event_id": "evt_token_mode",
            "event_type": "policy_change",
            "entities": [{"entity_id": "ent_policy", "role": "subject", "confidence": 0.7}],
            "impact": {"dimensions": [{"name": "policy", "score": 0.75}]},
            "confidence": 0.7,
            "uncertainty": {"score": 0.3, "factors": []},
            "evidence_refs": ["clm_token_mode"],
            "source_attribution": [{"source_id": "src_token_mode", "claim_ids": ["clm_token_mode"]}],
            "causality_links": [],
            "created_at": "2026-03-29T10:00:00+00:00",
        }
        events_file.write_text(json.dumps(event) + "\n", encoding="utf-8")

        os.environ["TRIAGE_EVENTS_FILE"] = str(events_file)
        os.environ["TRIAGE_AUDIT_FILE"] = str(audit_file)
        os.environ["TRIAGE_AUTH_MODE"] = "token"
        os.environ["TRIAGE_AUTH_TOKENS_JSON"] = json.dumps(
            {
                "tok-analyst": {
                    "tenant_id": "tenant-token",
                    "user_id": "user-token",
                    "roles": ["analyst"],
                }
            }
        )

        app_module = importlib.import_module("triage_api.app")
        app_module = importlib.reload(app_module)
        self.client = TestClient(app_module.app)

    def tearDown(self) -> None:
        os.environ.pop("TRIAGE_AUTH_MODE", None)
        os.environ.pop("TRIAGE_AUTH_TOKENS_JSON", None)
        self.temp_dir.cleanup()

    def test_token_mode_allows_alert_read_with_valid_token(self) -> None:
        response = self.client.get(
            "/v1/alerts",
            headers={"Authorization": "Bearer tok-analyst"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json().get("alerts", [])), 1)

    def test_token_mode_rejects_missing_token(self) -> None:
        response = self.client.get("/v1/alerts")
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
