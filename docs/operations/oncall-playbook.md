# Oncall Playbook

## Goals
- Detect incidents early.
- Escalate by severity with clear ownership.
- Close the loop with rollback and post-incident actions.

## Severity Matrix
- `P1`: availability incident, sustained 5xx spike, auth/payment outage.
- `P2`: latency degradation or critical dependency degradation.
- `P3`: warning-level anomalies with user impact risk.

## Automation
- Watchdog script: `npm run ops:oncall-watchdog`
- Scheduled workflow: `.github/workflows/oncall-watchdog.yml`
- Incident issue label: `ops-incident`

## Immediate Response
1. Validate signal with `npm run ops:post-deploy`.
2. If `P1`, freeze deployment and execute rollback playbook.
3. Confirm recovery with `npm run ops:post-deploy` and `npm run ops:security-baseline`.

## Closing Checklist
1. Update incident issue timeline.
2. Attach root cause and permanent fix.
3. Update thresholds or alert logic when false positive/negative is found.
