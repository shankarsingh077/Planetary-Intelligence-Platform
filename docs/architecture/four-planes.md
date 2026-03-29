# Four-Plane Architecture

## Plane Boundaries

### Data Plane
Responsibilities:
- Source ingestion
- Normalization
- Stream processing
- Raw and derived storage writes

Owns:
- Connectors
- Ingestion runtime
- Stream/topic contracts

Exposes:
- Versioned event streams
- Raw provenance metadata
- Ingestion health metrics

### Intelligence Plane
Responsibilities:
- Entity resolution
- Event fusion
- Confidence scoring
- Causality graph
- Forecasting and simulation

Owns:
- Event, entity, claim, evidence linking logic
- Risk cascade models
- Explainability payload generation

Exposes:
- Structured intelligence events
- Alerts, scenarios, recommendations
- Confidence and uncertainty outputs

### Experience Plane
Responsibilities:
- UI workspaces
- Command workflows
- Alert triage
- Visualization and collaboration

Owns:
- User-facing query composition
- Workspace state and personalization
- Explainable intelligence cards

Exposes:
- API requests to intelligence and control planes
- Audit-aware user actions

### Control Plane
Responsibilities:
- Identity and RBAC
- Tenant management
- Policy engine
- Observability and governance
- Billing

Owns:
- Authentication and authorization decisions
- Policy-as-code evaluation
- Tenant isolation controls
- Model governance workflows

Exposes:
- Access decisions
- Tenant-scoped configuration
- Governance and compliance records

## Non-Negotiable Constraints

1. No business logic in the wrong plane.
2. All cross-plane communication goes through versioned APIs/events.
3. Control plane authorization checks are mandatory for all mutating operations.
4. Intelligence outputs must include evidence and uncertainty fields.
5. Data plane does not overwrite historical truth snapshots.
