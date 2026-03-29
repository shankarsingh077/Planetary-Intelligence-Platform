from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from .adapters import CloudObjectStoreWriter, ObjectLakeWriter, ServingStore, WarehouseServingStore
from .profiles import load_store_profile


def build_storage_backends(lake_root: Path, sqlite_file: Path):
    profile_name = os.getenv("STORE_PROFILE", "local").strip().lower()
    profile = load_store_profile(profile_name)

    if profile.object_backend == "local":
        object_writer = ObjectLakeWriter(root_dir=lake_root)
    else:
        bucket = os.getenv(profile.object_bucket_env or "OBJECT_STORE_BUCKET", "")
        prefix = str(profile.extra.get("object_prefix", "planetary-intel/events"))
        mirror_root = Path(os.getenv("CLOUD_MIRROR_DIR", "./runtime-output/cloud-sync"))
        object_writer = CloudObjectStoreWriter(bucket=bucket, prefix=prefix, mirror_root=mirror_root)

    if profile.sql_backend == "sqlite":
        serving_store = ServingStore(db_file=sqlite_file)
    else:
        dsn = os.getenv(profile.warehouse_dsn_env or "WAREHOUSE_DSN", "")
        mirror_file = Path(os.getenv("WAREHOUSE_MIRROR_FILE", "./runtime-output/warehouse-events.jsonl"))
        serving_store = WarehouseServingStore(dsn=dsn, mirror_file=mirror_file)

    return object_writer, serving_store


def storage_health(lake_root: Path, sqlite_file: Path) -> dict[str, Any]:
    object_writer, serving_store = build_storage_backends(lake_root, sqlite_file)
    return {
        "object_store": object_writer.health_check(),
        "serving_store": serving_store.health_check(),
    }
