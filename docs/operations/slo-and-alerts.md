# SLO And Alerts

## SLO Targets
- API availability (5xx rate): 99.9% monthly.
- API p95 latency: <= 400ms for public endpoints.
- Read path success rate (`/read/*`): 99.5% monthly.
- Payment confirm success rate: 99.9% monthly.

## Core SLIs
- Request success ratio from server metrics (`2xx+3xx` / total).
- Endpoint latency histograms (p50/p95/p99).
- Error budget burn (1h and 6h windows).
- Queue backlog size for retry jobs.

## Alert Levels
- P1: availability < 99.0% in 5m, or payment confirm failures > 5% in 5m.
- P2: p95 latency > 800ms for 15m.
- P3: queue backlog > 500 for 30m.

## Health Endpoints
- `/api/health/live`: process liveness.
- `/api/health/ready`: dependency readiness (DB + memory snapshot).
- `/api/health/detail`: operational counters for pending orders/retries.

## Runbook Links
- Rollback: `docs/operations/rollback-playbook.md`
- Alert rules: `ops/alerts/prometheus.rules.yaml`