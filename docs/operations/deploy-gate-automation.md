# Deploy Gate Automation

This project includes script-based deploy verification, production-safe admin session smoke checks, and lightweight load smoke checks.

## 1) Recommended Deploy Gate

Use this right after each production deployment:

```bash
BACKEND_URL=https://comics-production-07fa.up.railway.app \
FRONTEND_URL=https://www.gushcomics.com \
EXPECT_BACKEND_COMMIT=<commit-sha> \
EXPECT_FRONTEND_COMMIT=<commit-sha> \
EXPECT_FRONTEND_REPO=<owner/repo> \
OPS_ADMIN_KEY=<production-admin-key> \
npm run ops:deploy-gate
```

What it covers:

- backend health and version endpoints
- frontend identity headers (`X-Gush-Frontend-Revision`, `X-Gush-Frontend-Repo`, `X-Gush-Frontend-Branch`)
- frontend trust-safe route audits (`/`, `/creators`, `/rankings`, `/series/series-008`, `/series/series-012`, `/series/series-005`)
- optional observability thresholds
- admin login -> verify -> read-only admin API -> append-only audit delete probe -> logout -> token invalidation

If `OPS_ADMIN_KEY` or `ADMIN_KEY` is not provided, the admin session smoke step is skipped by default.
Set `OPS_ADMIN_REQUIRED=1` if you want missing admin credentials to fail the gate.

## 2) Post-deploy Verification Only

If you only want health/version/frontend checks without admin session validation:

```bash
BACKEND_URL=https://comics-production-07fa.up.railway.app \
FRONTEND_URL=https://www.gushcomics.com \
EXPECT_BACKEND_COMMIT=<commit-sha> \
EXPECT_FRONTEND_COMMIT=<commit-sha> \
EXPECT_FRONTEND_REPO=<owner/repo> \
npm run ops:post-deploy
```

Optional environment variables:

- `OBSERVABILITY_KEY`: required if `/api/meta/observability` is private in production.
- `EXPECT_FRONTEND_COMMIT`: expected frontend git SHA exposed by the deployed Next.js app.
- `EXPECT_FRONTEND_REPO`: expected frontend repository slug exposed by the deployed Next.js app.
- `EXPECT_FRONTEND_BRANCH`: expected frontend git branch exposed by the deployed Next.js app.
- `OPS_ROUNDS` (default `3`): verification rounds.
- `OPS_INTERVAL_MS` (default `3000`): interval between rounds.
- `OPS_MAX_ENDPOINT_P95_MS` (default `1500`): backend endpoint p95 latency threshold.
- `OPS_MAX_FRONTEND_P95_MS` (default `1800`): frontend route p95 latency threshold.
- `OPS_MAX_OBS_ERROR_RATE_PCT` (default `2`): observability error-rate threshold.
- `OPS_MAX_OBS_P95_MS` (default `1200`): observability p95 latency threshold.
- `OBS_REQUIRED=1`: fail if observability endpoint is unreachable/forbidden.
- `FRONTEND_ROUTES`: override default frontend routes. Default is `/,/creators,/rankings,/series/series-008`.

The content audit also compares the rendered frontend against the backend creator-data mode:

- if live public creator credits exist, `/creators` must behave like a real discovery page
- if live public creator credits do not exist yet, `/creators` must stay in the honest fallback mode instead of rendering fake creator entries

## 3) Admin Session Smoke Only

Use this if you need to validate production-safe admin authentication behavior without running the full gate:

```bash
BACKEND_URL=https://comics-production-07fa.up.railway.app \
OPS_ADMIN_KEY=<production-admin-key> \
npm run ops:admin-smoke
```

Optional environment variables:

- `OPS_ADMIN_REQUIRED=1`: fail if admin key is missing.
- `OPS_ADMIN_READ_PATH`: override the read-only admin endpoint with a single path.
- `OPS_ADMIN_READ_PATHS`: comma-separated read-only admin endpoints. Default is `/api/admin/series?page=1&pageSize=1,/api/admin/users?page=1&pageSize=1,/api/admin/support?page=1&pageSize=1,/api/admin/orders?page=1&pageSize=1`.
- `OPS_REQUEST_TIMEOUT_MS`: request timeout in milliseconds.

The script only performs:

- unauthorized read check
- admin login
- token verify
- multiple read-only admin GET checks (series/users/support/orders by default)
- append-only audit log delete probe using DELETE /api/admin/logs/probe-log-id-for-deploy-check (must return 403)
- logout
- verify/refresh/read rejection after logout

It does not create, update, refund, or delete production data.

## 4) Load Smoke

Use this for quick production-safe pressure checks (not full stress tests):

```bash
LOAD_TARGETS=https://comics-production-07fa.up.railway.app/api/health,https://comics-production-07fa.up.railway.app/api/health/ready \
LOAD_DURATION_SEC=20 \
LOAD_CONCURRENCY=15 \
npm run ops:load-smoke
```

Optional thresholds:

- `LOAD_MAX_ERROR_RATE_PCT` (default `1`)
- `LOAD_MAX_P95_MS` (default `1200`)

## 5) Rollback Verification

After rollback, run the same deploy gate with the rollback target commit:

```bash
BACKEND_URL=https://comics-production-07fa.up.railway.app \
FRONTEND_URL=https://www.gushcomics.com \
EXPECT_BACKEND_COMMIT=<rollback-commit-sha> \
OPS_ADMIN_KEY=<production-admin-key> \
npm run ops:deploy-gate
```

## 6) GitHub Actions

Manual workflow is available:

- Production workflow: `.github/workflows/post-deploy-verification.yml`
- Staging workflow: `.github/workflows/staging-deploy-verification.yml`
- Trigger: `workflow_dispatch`
- Supports:
  - post-deploy verification
  - admin session smoke if the matching admin secret exists
  - optional backend load smoke

## 7) Continuous Operations

- Oncall watchdog workflow: `.github/workflows/oncall-watchdog.yml`
- Weekly resilience drill workflow: `.github/workflows/resilience-drill.yml`

## 8) Route Inventory

Use this to export the current admin route map directly from controller code:

```bash
npm run ops:admin-routes
```

Default outputs:

- `docs/operations/admin-route-inventory.md`
- `docs/operations/admin-route-inventory.json`

Optional overrides:

- `OPS_ADMIN_ROUTE_INVENTORY_OUT`
- `OPS_ADMIN_ROUTE_INVENTORY_JSON_OUT`
- `OPS_ADMIN_ROUTE_INVENTORY_STDOUT=1`
