# Infrastructure Scaffold

This folder contains infrastructure-as-code scaffolding for Sprint 1 and onward.

## Layout

- environments: Composed deployment targets by environment.
- modules: Reusable building blocks.
- policies: Infra policy checks and conventions.

## Sprint 1 intent

1. Define staging infrastructure target for stream, storage, and Kubernetes runtime.
2. Capture conventions and defaults before provisioning.
3. Keep all secret values out of repository.

## Current defaults

1. Cloud: GCP
2. Staging region: asia-south1
3. Stream backend: Kafka
4. SQL backend: PostgreSQL
5. GKE strategy: create new cluster for staging

## Next step

Fill [infra/environments/staging/terraform.tfvars.example](environments/staging/terraform.tfvars.example) and use your preferred IaC runner.
