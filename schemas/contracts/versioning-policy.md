# Schema Versioning Policy

## Compatibility Levels

- PATCH: Non-breaking documentation or optional-field updates.
- MINOR: Backward-compatible field additions or enum extensions.
- MAJOR: Breaking changes requiring coordinated migration.

## Rules

1. Existing required fields cannot be removed in MINOR/PATCH releases.
2. Enum value removals are MAJOR changes.
3. Renaming a field is always MAJOR.
4. Any MAJOR change requires migration notes and dual-read window plan.

## CI Gates

1. Backward compatibility checks run against previous released schema version.
2. Consumer-driven contract tests must pass for known downstream consumers.
3. Schema release notes are required for merge.

## Local Validation Command

```bash
python tools/schema_guard/compatibility_check.py
```

Baseline snapshots are currently stored in `schemas/baseline/v1/canonical/`.
