# Rollback Playbook

## Trigger Conditions
- P1 incident confirmed.
- Release causes sustained 5xx spike (>2% for 5m).
- Payment path regression or auth outage.

## Immediate Actions (0-10 min)
1. Freeze new deployments.
2. Capture failing request IDs and top error signatures.
3. Switch traffic to previous stable release.

## Rollback Steps
1. Identify previous stable commit SHA from production tags.
2. Redeploy previous release artifact.
3. Run smoke checks:
   - `GET /api/health/live`
   - `GET /api/health/ready`
   - frontend routes `/`, `/search`, `/store`
4. Confirm error rate and latency recovery.

## Verification Checklist
- 5xx error rate back to baseline.
- p95 latency within SLO.
- Auth/login and payment confirm endpoint working.
- No queue backlog growth.

## Post-Incident
1. Open incident timeline doc.
2. Add root cause + permanent fix ticket.
3. Update alert thresholds/runbook if needed.