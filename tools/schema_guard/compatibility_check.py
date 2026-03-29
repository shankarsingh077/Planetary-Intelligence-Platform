from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _normalize_type(raw_type: Any) -> tuple[str, ...]:
    if isinstance(raw_type, str):
        return (raw_type,)
    if isinstance(raw_type, list):
        return tuple(sorted(str(t) for t in raw_type))
    return ()


def _enum_set(node: dict[str, Any]) -> set[str]:
    raw = node.get("enum", [])
    if not isinstance(raw, list):
        return set()
    return {str(v) for v in raw}


def _collect_required_paths(schema: dict[str, Any], prefix: str = "") -> set[str]:
    required_paths: set[str] = set()
    required = schema.get("required", [])
    if isinstance(required, list):
        for field in required:
            required_paths.add(f"{prefix}/{field}" if prefix else f"/{field}")

    properties = schema.get("properties", {})
    if isinstance(properties, dict):
        for key, child in properties.items():
            child_prefix = f"{prefix}/{key}" if prefix else f"/{key}"
            if isinstance(child, dict):
                required_paths |= _collect_required_paths(child, child_prefix)

    items = schema.get("items")
    if isinstance(items, dict):
        item_prefix = f"{prefix}[]" if prefix else "/[]"
        required_paths |= _collect_required_paths(items, item_prefix)

    return required_paths


def _collect_nodes(schema: dict[str, Any], prefix: str = "") -> dict[str, dict[str, Any]]:
    nodes: dict[str, dict[str, Any]] = {prefix or "/": schema}

    properties = schema.get("properties", {})
    if isinstance(properties, dict):
        for key, child in properties.items():
            if not isinstance(child, dict):
                continue
            child_prefix = f"{prefix}/{key}" if prefix else f"/{key}"
            nodes.update(_collect_nodes(child, child_prefix))

    items = schema.get("items")
    if isinstance(items, dict):
        item_prefix = f"{prefix}[]" if prefix else "/[]"
        nodes.update(_collect_nodes(items, item_prefix))

    return nodes


def _compare_schema(baseline: dict[str, Any], current: dict[str, Any], schema_name: str) -> list[str]:
    errors: list[str] = []

    baseline_required = _collect_required_paths(baseline)
    current_required = _collect_required_paths(current)

    for missing in sorted(baseline_required - current_required):
        errors.append(f"{schema_name}: required field removed: {missing}")

    baseline_nodes = _collect_nodes(baseline)
    current_nodes = _collect_nodes(current)

    for path, old_node in baseline_nodes.items():
        new_node = current_nodes.get(path)
        if new_node is None:
            errors.append(f"{schema_name}: schema path removed: {path}")
            continue

        old_types = set(_normalize_type(old_node.get("type")))
        new_types = set(_normalize_type(new_node.get("type")))
        if old_types and new_types and not old_types.issubset(new_types):
            errors.append(
                f"{schema_name}: incompatible type change at {path}: baseline={sorted(old_types)} current={sorted(new_types)}"
            )

        old_enum = _enum_set(old_node)
        new_enum = _enum_set(new_node)
        if old_enum and new_enum and not old_enum.issubset(new_enum):
            removed = sorted(old_enum - new_enum)
            errors.append(f"{schema_name}: enum values removed at {path}: {removed}")

    return errors


def run_check(baseline_dir: Path, current_dir: Path) -> int:
    errors: list[str] = []
    baseline_files = sorted(baseline_dir.glob("*.json"))

    if not baseline_files:
        print(f"No baseline schema files found in {baseline_dir}")
        return 1

    for baseline_file in baseline_files:
        current_file = current_dir / baseline_file.name
        if not current_file.exists():
            errors.append(f"Missing current schema for baseline file: {baseline_file.name}")
            continue

        baseline_schema = _load_json(baseline_file)
        current_schema = _load_json(current_file)
        errors.extend(_compare_schema(baseline_schema, current_schema, baseline_file.name))

    if errors:
        print("Schema compatibility check failed:")
        for err in errors:
            print(f"- {err}")
        return 1

    print("Schema compatibility check passed.")
    return 0


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check backward compatibility between baseline and current JSON schemas")
    parser.add_argument(
        "--baseline-dir",
        type=Path,
        default=Path("schemas/baseline/v1/canonical"),
        help="Directory containing baseline schema files",
    )
    parser.add_argument(
        "--current-dir",
        type=Path,
        default=Path("schemas/canonical"),
        help="Directory containing current schema files",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    exit_code = run_check(args.baseline_dir, args.current_dir)
    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
