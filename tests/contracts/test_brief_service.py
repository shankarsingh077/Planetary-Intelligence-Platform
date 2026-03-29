from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from brief_service.engine import BriefScope, build_alerts, generate_now_brief


class TestBriefService(unittest.TestCase):
    def _write_events(self) -> Path:
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False)
        event = {
            "event_id": "evt_1",
            "event_type": "volatility_spike",
            "entities": [{"entity_id": "ent_markets", "role": "subject", "confidence": 0.6}],
            "impact": {"dimensions": [{"name": "financial", "score": 0.82}]},
            "confidence": 0.72,
            "uncertainty": {"score": 0.28, "factors": ["sample"]},
            "evidence_refs": ["clm_1"],
            "source_attribution": [{"source_id": "src_a", "claim_ids": ["clm_1"]}],
            "created_at": "2026-03-29T10:00:00+00:00",
        }
        tmp.write(json.dumps(event) + "\n")
        tmp.close()
        return Path(tmp.name)

    def test_build_alerts(self) -> None:
        events_file = self._write_events()
        alerts = build_alerts("tenant-demo", events_file, BriefScope([], [], []), max_alerts=5)
        self.assertEqual(len(alerts), 1)
        self.assertIn("recommended_actions", alerts[0])

    def test_generate_now_brief(self) -> None:
        events_file = self._write_events()
        brief = generate_now_brief("tenant-demo", "user-demo", BriefScope([], [], []), events_file)
        self.assertIn("changed", brief)
        self.assertIn("recommendedActions", brief)


if __name__ == "__main__":
    unittest.main()
