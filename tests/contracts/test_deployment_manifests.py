from __future__ import annotations

import unittest
from pathlib import Path


class TestDeploymentManifests(unittest.TestCase):
    def test_manifests_exist(self) -> None:
        root = Path(__file__).resolve().parents[2]
        connectors_manifest = root / "deploy" / "manifests" / "kubernetes" / "data-plane-connectors.yaml"
        storage_manifest = root / "deploy" / "manifests" / "kubernetes" / "storage-runtime-job.yaml"

        self.assertTrue(connectors_manifest.exists())
        self.assertTrue(storage_manifest.exists())

    def test_profiles_exist(self) -> None:
        root = Path(__file__).resolve().parents[2]
        expected = [
            root / "deploy" / "profiles" / "streams" / "kafka.json",
            root / "deploy" / "profiles" / "streams" / "redpanda.json",
            root / "deploy" / "profiles" / "stores" / "local.json",
            root / "deploy" / "profiles" / "stores" / "cloud.json",
        ]
        for item in expected:
            self.assertTrue(item.exists())


if __name__ == "__main__":
    unittest.main()
