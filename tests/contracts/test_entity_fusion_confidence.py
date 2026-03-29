from __future__ import annotations

import unittest

from confidence_service.engine import calibrate_event_confidence
from entity_resolver.engine import resolve_event_entities
from fusion_service.engine import fuse_events


class TestEntityFusionConfidence(unittest.TestCase):
    def test_entity_resolution_adds_resolved_entities(self) -> None:
        event = {
            "event_id": "evt_1",
            "event_type": "volatility_spike",
            "entities": [{"entity_id": "ent-markets", "role": "subject", "confidence": 0.6}],
            "created_at": "2026-03-29T10:00:00+00:00",
            "causality_links": [],
            "source_attribution": [{"source_id": "src_a", "claim_ids": ["clm_1"]}],
            "impact": {"dimensions": [{"name": "financial", "score": 0.8}]},
            "uncertainty": {"score": 0.3, "factors": []},
            "confidence": 0.6,
        }

        resolved = resolve_event_entities(event)
        self.assertIn("resolved_entities", resolved)
        self.assertTrue(resolved["resolved_entities"][0]["entity_id"].startswith("ent_"))

    def test_fusion_adds_cluster_metadata(self) -> None:
        events = [
            resolve_event_entities(
                {
                    "event_id": "evt_1",
                    "event_type": "volatility_spike",
                    "entities": [{"entity_id": "ent_markets", "role": "subject", "confidence": 0.6}],
                    "created_at": "2026-03-29T10:00:00+00:00",
                    "causality_links": [],
                    "source_attribution": [{"source_id": "src_a", "claim_ids": ["clm_1"]}],
                    "impact": {"dimensions": [{"name": "financial", "score": 0.7}]},
                    "uncertainty": {"score": 0.3, "factors": []},
                    "confidence": 0.6,
                }
            ),
            resolve_event_entities(
                {
                    "event_id": "evt_2",
                    "event_type": "volatility_spike",
                    "entities": [{"entity_id": "ent_markets", "role": "subject", "confidence": 0.7}],
                    "created_at": "2026-03-29T10:03:00+00:00",
                    "causality_links": [],
                    "source_attribution": [{"source_id": "src_b", "claim_ids": ["clm_2"]}],
                    "impact": {"dimensions": [{"name": "financial", "score": 0.75}]},
                    "uncertainty": {"score": 0.25, "factors": []},
                    "confidence": 0.7,
                }
            ),
        ]

        fused = fuse_events(events)
        self.assertEqual(len(fused), 2)
        self.assertIn("fusion_cluster_id", fused[0])
        self.assertIn("fusion_cluster_size", fused[0])

    def test_confidence_calibration_updates_uncertainty(self) -> None:
        event = {
            "event_id": "evt_1",
            "event_type": "policy_change",
            "entities": [{"entity_id": "ent_news", "role": "subject", "confidence": 0.6}],
            "resolved_entities": [{"entity_id": "ent_news", "role": "subject", "confidence": 0.65}],
            "created_at": "2026-03-29T10:00:00+00:00",
            "source_attribution": [
                {"source_id": "src_a", "claim_ids": ["clm_1"]},
                {"source_id": "src_b", "claim_ids": ["clm_2"]},
            ],
            "fusion_cluster_size": 2,
            "confidence": 0.55,
            "uncertainty": {"score": 0.45, "factors": ["seed"]},
        }

        calibrated = calibrate_event_confidence(event)
        self.assertGreater(calibrated["confidence"], 0.0)
        self.assertIn("factors", calibrated["uncertainty"])
        self.assertGreater(len(calibrated["uncertainty"]["factors"]), 1)


if __name__ == "__main__":
    unittest.main()
