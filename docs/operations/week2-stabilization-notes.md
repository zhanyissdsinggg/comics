# Week 2 Stabilization Notes

## Scope
This document captures the week-2 hardening pass after strict-full release gating was enabled.

## Completed
1. Alert noise reduction
- `scripts/ops/oncall-watchdog.mjs` now supports `WATCHDOG_FAIL_ON_SEVERITY`.
- Default blocking threshold is set to `P2` in strict-full mode.
- Result: transient P3 latency blips no longer block deployment by default.

2. Probe resilience
- `post-deploy`, `watchdog`, and admin smoke probes now retry transient failures (`status=0`, `5xx`).
- Result: lower false-negative rate during temporary network jitter.

3. Admin runtime verification stability
- `admin-ui-live` checks were stabilized to avoid brittle text-only selectors.
- Runtime validation remains behavior-based (navigation, route transitions, and action outcomes).

4. Support write-path switch verification
- `admin-write-smoke` now supports dual mode:
  - `OPS_ADMIN_WRITE_SUPPORT=1` (best-effort verification, warning-only on runtime limitations)
  - `OPS_ADMIN_WRITE_SUPPORT=1 + OPS_ADMIN_WRITE_SUPPORT_REQUIRED=1` (blocking verification)
- Current live behavior: support ticket create endpoint returns `500`, so required mode fails by design.

## Current Production Snapshot
- Strict full deploy gate: passing
- Admin UI live interaction sweep: passing
- Admin reversible write smoke: passing
- Support write required mode: failing (known backend limitation: `/api/support` -> `500`)
- Read-path load smoke (`30s`, `concurrency=20`): passing

## Recommended Operational Defaults
```powershell
$env:WATCHDOG_FAIL_ON_SEVERITY='P2'
$env:OPS_ALLOWED_BACKEND_SLOW_SAMPLES='1'
$env:OPS_ALLOWED_FRONTEND_SLOW_SAMPLES='1'
```

## Pending Follow-up (non-blocking for launch)
1. Fix `/api/support` runtime 500 in production.
2. After fix, promote support write verification to blocking mode:
```powershell
$env:OPS_ADMIN_WRITE_ALLOWED='1'
$env:OPS_ADMIN_WRITE_REMOTE_ALLOWED='1'
$env:OPS_ADMIN_WRITE_PROD_ALLOWED='1'
$env:OPS_ADMIN_WRITE_SUPPORT='1'
$env:OPS_ADMIN_WRITE_SUPPORT_REQUIRED='1'
npm run ops:admin-write-smoke
```
