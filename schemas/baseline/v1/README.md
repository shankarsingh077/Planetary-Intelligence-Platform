# Baseline Schemas (v1)

These baseline snapshots define the compatibility floor for canonical schemas.

## Usage

Run compatibility check from repository root:

```bash
python tools/schema_guard/compatibility_check.py
```

If the checker reports removals or incompatible type/enum changes, bump schema major version and coordinate migration before merge.
