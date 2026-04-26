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
   - `GET /api/series/demo-series?adult=0`
   - `GET /api/episode?seriesId=demo-series&episodeId=demo-episode`
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
npm run ops:reader-live
npm run ops:admin-ui-live
npm run ops:oncall-watchdog
```

## Unified Deploy Gate
```powershell
# Standard gate (recommended default)
$env:BACKEND_URL='https://www.gushcomics.com'
$env:FRONTEND_URL='https://www.gushcomics.com'
npm run ops:deploy-gate

# Strict gate (release-candidate / pre-major-release)
# Default strict: content-first audit + resilient runtime checks
npm run ops:deploy-gate:strict

# Strict full (recommended for release candidate)
# Requires valid OBSERVABILITY_KEY configured on backend
# Script enforces required env vars and strict full flags automatically
# Also requires admin credentials and runs admin smoke as blocking
$env:OBSERVABILITY_KEY='<observability_key>'
$env:OPS_ADMIN_EMAIL='<admin_email>'
$env:OPS_ADMIN_PASSWORD='<admin_password>'
# or: $env:OPS_ADMIN_KEY='<legacy_admin_key>'
npm run ops:deploy-gate:strict:full
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

# Provide observability access key for strict full mode
$env:OBSERVABILITY_KEY='<observability_key>'

# Optional: tighten backend latency tolerance for strict mode
$env:OPS_ALLOWED_BACKEND_SLOW_SAMPLES='0'

# Watchdog blocks only when severity >= this threshold (OK/P3/P2/P1)
$env:WATCHDOG_FAIL_ON_SEVERITY='P2'
```

## If Admin Runtime Fails
```powershell
cd "c:/Users/86133/Downloads/tappytoon-nextjs"
$env:BACKEND_URL='https://www.gushcomics.com'
$env:FRONTEND_URL='https://www.gushcomics.com'
$env:OPS_ADMIN_EMAIL='<admin_email>'
$env:OPS_ADMIN_PASSWORD='<admin_password>'
npm run ops:admin-ui-live
npm run ops:admin-smoke
```

Compatibility fallback:
```powershell
$env:OPS_ADMIN_KEY='<legacy_admin_key>'
npm run ops:admin-ui-live
npm run ops:admin-smoke
```

Support write-path verification:
```powershell
$env:BACKEND_URL='https://www.gushcomics.com'
$env:OPS_ADMIN_EMAIL='<admin_email>'
$env:OPS_ADMIN_PASSWORD='<admin_password>'
$env:OPS_ADMIN_WRITE_ALLOWED='1'
$env:OPS_ADMIN_WRITE_REMOTE_ALLOWED='1'
$env:OPS_ADMIN_WRITE_PROD_ALLOWED='1'
$env:OPS_ADMIN_WRITE_SUPPORT='1'
# Optional: make support verification blocking
$env:OPS_ADMIN_WRITE_SUPPORT_REQUIRED='1'
npm run ops:admin-write-smoke
```

## Known Runtime Notes (as of 2026-04-16)
- `GET /api/meta/observability` is protected and returns `403` without `x-observability-key`.
- Strict full mode requires backend/CI to share the same `OBSERVABILITY_KEY`.
- Strict full mode requires admin credentials and treats admin smoke as blocking.

## Escalation
1. 10 min unresolved P1: trigger rollback.
2. 20 min unresolved P1: freeze deploys and start incident notes.
3. 30 min unresolved P1: engage infra + backend owners jointly.

## Rollback Verification
```powershell
cd "c:/Users/86133/Downloads/tappytoon-nextjs"
$env:BACKEND_URL='https://www.gushcomics.com'
$env:FRONTEND_URL='https://www.gushcomics.com'
$env:EXPECT_BACKEND_COMMIT='<target_backend_commit>'
$env:EXPECT_FRONTEND_COMMIT='<target_frontend_commit>'
npm run ops:rollback-verify
```

## Seeding Demo Routes (Production)
Railway's UI may not expose a shell/exec console on all plans. Use Railway CLI to run the demo-only seed safely.

```powershell
cd "c:/Users/86133/Downloads/tappytoon-nextjs"

# One-time: login and link (interactive)
railway login
railway link

# Demo-only seed (safe in production)
railway run -- npm --prefix backend run seed:demo
```

Verify:
- `GET /api/series/demo-series?adult=0` -> 200
- `GET /api/episode?seriesId=demo-series&episodeId=demo-episode` -> 200
- `GET /read/demo-series/demo-episode` -> contents drawer opens

## Post-incident Record
- Incident start/end time
- Impacted routes/endpoints
- User impact
- Root cause
- Fix/rollback commit
- Follow-up action items (with owner/date)
