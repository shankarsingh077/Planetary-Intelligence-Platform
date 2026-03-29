# Staging Environment Definition

This environment is the first real infra cutover target for Sprint 1.

## Required inputs

1. project_id
2. project_number
3. region
4. stream backend settings
5. storage bucket names
6. SQL connection target
7. GKE cluster and namespace settings

## Suggested defaults

1. project_id: planetaryintelligenceplatform
2. project_number: 145930903164
3. region: asia-south1
4. stream backend: kafka
5. sql_engine: postgresql
6. gke mode: new cluster

## Verification scripts

1. [scripts/verify_stream_connectivity.sh](../../../scripts/verify_stream_connectivity.sh)
2. [scripts/verify_storage_connectivity.sh](../../../scripts/verify_storage_connectivity.sh)
