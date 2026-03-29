# Taxonomy and Scoring Governance

## Scope

This governance process applies to:
- Event taxonomy and type definitions
- Impact dimension definitions
- Confidence and uncertainty scoring policy
- Causality edge semantics

## Change Process

1. Author a change proposal in `schemas/taxonomy/proposals/`.
2. Run impact analysis:
   - Backward compatibility impact
   - Model behavior impact
   - Alerting behavior impact
   - UI interpretation impact
3. Review board approval required for production rollout.
4. Version bump and release notes are mandatory.
5. Rollback plan must be defined before deployment.

## Review Board Roles

- Intelligence lead
- Data platform lead
- Product analyst representative
- Security/compliance representative

## Policy Rules

1. Breaking schema changes require major version increments.
2. Confidence policy changes require calibration report update.
3. Any taxonomy deprecation needs a migration window and mapping file.
4. Every displayed score must be traceable to model version and input evidence.
