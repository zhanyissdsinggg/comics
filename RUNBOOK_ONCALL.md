# On-call Runbook (v1)

## Scope
- Frontend: `https://www.gushcomics.com`
- Backend API: `https://www.gushcomics.com/api/*`
- Admin: `https://www.gushcomics.com/admin`

## P1 Trigger Rules
- Backend error-rate > 1% (5 min window)
- API p95 > 2000ms (5 min window)
- Admin cannot login or key admin pages unavailable
- Health probes fail continuously for 3 rounds

## First 10 Minutes Checklist
1. Confirm active deploy revision and branch.
2. Run quick probes:
   - `GET /api/meta/version`
   - `GET /api/health/live`
   - `GET /api/series?adult=0`
   - `GET /`
   - `GET /admin`
3. Check latest automated reports:
   - `ops-watchdog-report.md`
   - `ops-watchdog-report.json`
4. Decide severity:
   - user-facing outage -> P1
   - degraded route(s) without full outage -> P2

## Recovery Commands (local)
```powershell
cd "c:/Users/86133/Downloads/tappytoon-nextjs"

# Static quality gate
npm run health-check

# Frontend route smoke
npm --prefix frontend run smoke:routes

# Ops probes (requires env)
$env:BACKEND_URL='https://www.gushcomics.com'
$env:FRONTEND_URL='https://www.gushcomics.com'
npm run ops:post-deploy
npm run ops:oncall-watchdog
```

### Optional strict modes
```powershell
# Enforce advanced health endpoints in post-deploy gate
$env:OPS_REQUIRE_ADVANCED_HEALTH='1'

# Enforce frontend copy contract audit
$env:OPS_STRICT_CONTENT_AUDIT='1'

# Treat observability endpoint absence as hard failure
$env:WATCHDOG_REQUIRE_OBSERVABILITY='1'
$env:SEC_REQUIRE_OBSERVABILITY_ENDPOINT='1'
```

## If Admin Runtime Fails
```powershell
cd "c:/Users/86133/Downloads/tappytoon-nextjs"
$env:FRONTEND_URL='https://www.gushcomics.com'
$env:OPS_ADMIN_EMAIL='<admin_email>'
$env:OPS_ADMIN_PASSWORD='<admin_password>'
npm run ops:admin-ui-live
```

Compatibility fallback:
```powershell
$env:OPS_ADMIN_KEY='<legacy_admin_key>'
npm run ops:admin-ui-live
```

## Known Contract Gaps (as of 2026-04-15)
- `/api/health/ready` and `/api/health/detail` return 404 in live runtime.
- Observability probe endpoint expected by scripts returns 404.
- On Windows local runtime, watchdog may exit with `UV_HANDLE_CLOSING` after report generation.

## Escalation
1. 10 min unresolved P1: trigger rollback.
2. 20 min unresolved P1: freeze deploys and start incident notes.
3. 30 min unresolved P1: engage infra + backend owners jointly.

## Post-incident Record
- Incident start/end time
- Impacted routes/endpoints
- User impact
- Root cause
- Fix/rollback commit
- Follow-up action items (with owner/date)
