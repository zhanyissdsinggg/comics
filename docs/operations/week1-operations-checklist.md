# Week 1 Operations Checklist

## Goal
This checklist is for the first 7 days after production release.
It keeps daily operations simple, repeatable, and evidence-based.

## Required Env (for command blocks below)
```powershell
$env:BACKEND_URL='https://www.gushcomics.com'
$env:FRONTEND_URL='https://www.gushcomics.com'
$env:OBSERVABILITY_KEY='<observability_key>'
$env:OPS_ADMIN_EMAIL='<admin_email>'
$env:OPS_ADMIN_PASSWORD='<admin_password>'
```

## Daily Start (10-15 minutes)
Run this at the beginning of each operations day.

1. Deploy gate (strict full)
```powershell
npm run ops:deploy-gate:strict:full
```
Expected: full pass with no blocking failures.

2. Runtime watchdog snapshot
```powershell
npm run ops:oncall-watchdog
```
Expected: `severity=OK`.

3. Frontend + backend revision sanity check
```powershell
$backend = (Invoke-WebRequest -Uri 'https://www.gushcomics.com/api/meta/version' -UseBasicParsing -TimeoutSec 20).Content | ConvertFrom-Json
$frontend = (Invoke-WebRequest -Uri 'https://www.gushcomics.com/' -UseBasicParsing -TimeoutSec 20).Headers['x-gush-frontend-revision']
Write-Output "backend=$($backend.commit)"
Write-Output "frontend=$frontend"
```
Expected: backend and frontend revisions match the active release target.

## Daily Midday (5-10 minutes)
1. Admin interaction sweep
```powershell
npm run ops:admin-ui-live
```
Expected: no FAIL entries in the generated report.

2. Reversible write smoke
```powershell
$env:OPS_ADMIN_WRITE_ALLOWED='1'
npm run ops:admin-write-smoke
```
Expected: QA user mutation and notification roundtrip both pass and auto-restore.

## Daily End (5 minutes)
1. Save artifacts for traceability:
- `ops-watchdog-report.json`
- `ops-watchdog-report.md`
- `frontend/.tmp-admin-audit/live-interactions/latest.json`
- `frontend/.tmp-admin-audit/live-interactions/latest.txt`

2. Record a short daily note:
- Date/time
- Gate status (pass/fail)
- Any transient warnings (latency spikes, retries)
- Actions taken

## Day 1 / Day 3 / Day 7 Deep Checks
Run this heavier set on day 1, day 3, and day 7.

1. Integration baseline
```powershell
npm --prefix backend run test:integration
```

2. Route inventory refresh (admin)
```powershell
npm run ops:admin-routes
```
Expected output:
- `docs/operations/admin-route-inventory.md`
- `docs/operations/admin-route-inventory.json`

3. Read-path load smoke
```powershell
$env:LOAD_TARGETS='https://www.gushcomics.com/api/health,https://www.gushcomics.com/api/series?adult=0,https://www.gushcomics.com/api/meta/version'
$env:LOAD_DURATION_SEC='20'
$env:LOAD_CONCURRENCY='12'
$env:LOAD_MAX_P95_MS='2500'
npm run ops:load-smoke
```

## Escalation Rules
Treat any of these as immediate P1/P2 triggers:
- `ops:deploy-gate:strict:full` blocking failure
- `watchdog` severity P1/P2
- admin login/write smoke cannot complete
- frontend/backend commit mismatch during active release

If P1 lasts >10 minutes, start rollback verification:
```powershell
$env:EXPECT_BACKEND_COMMIT='<target_backend_commit>'
$env:EXPECT_FRONTEND_COMMIT='<target_frontend_commit>'
npm run ops:rollback-verify
```

## Security Follow-up (after full stabilization)
- Rotate `OBSERVABILITY_KEY`
- Rotate temporary admin password
- Remove any temporary QA credentials from shared channels
