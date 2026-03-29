# Chaos Drills

Run drills to validate graceful degradation and incident readiness.

## Drill scenarios

1. Source outage simulation
2. Stream lag spike simulation
3. Serving store unavailability simulation
4. Intelligence API partial failure simulation

## Run local dry check

```bash
./.venv/bin/python sre/chaos/run_chaos_check.py --mode dry-run
```
