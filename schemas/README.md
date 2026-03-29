# Schema Contracts

This directory contains the canonical intelligence data model and contract policies.

## Structure

- `canonical/` Core object schemas and envelopes
- `taxonomy/` Enumerations and impact dimensions
- `contracts/` Versioning and compatibility rules

## Principles

1. Every event is immutable per revision.
2. No source attribution is lost during enrichment.
3. Confidence and uncertainty fields are required in intelligence outputs.
4. Causality links are typed and directed.
