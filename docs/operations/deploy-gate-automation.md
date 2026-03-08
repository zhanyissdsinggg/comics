# Deploy Gate Automation

This project includes script-based deploy verification and lightweight load smoke checks.

## 1) Post-deploy Verification

Use this right after each production deployment:

```bash
BACKEND_URL=https://comics-production-07fa.up.railway.app \
FRONTEND_URL=https://www.gushcomics.com \
EXPECT_BACKEND_COMMIT=<commit-sha> \
npm run ops:post-deploy
```

Optional environment variables:

- `OBSERVABILITY_KEY`: required if `/api/meta/observability` is private in production.
- `OPS_ROUNDS` (default `3`): verification rounds.
- `OPS_INTERVAL_MS` (default `3000`): interval between rounds.
- `OPS_MAX_ENDPOINT_P95_MS` (default `1500`): endpoint p95 latency threshold.
- `OPS_MAX_OBS_ERROR_RATE_PCT` (default `2`): observability error-rate threshold.
- `OPS_MAX_OBS_P95_MS` (default `1200`): observability p95 latency threshold.
- `OBS_REQUIRED=1`: fail if observability endpoint is unreachable/forbidden.

## 2) Load Smoke

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

## 3) Rollback Verification

After rollback, run the same post-deploy script with the rollback target commit:

```bash
BACKEND_URL=https://comics-production-07fa.up.railway.app \
FRONTEND_URL=https://www.gushcomics.com \
EXPECT_BACKEND_COMMIT=<rollback-commit-sha> \
npm run ops:post-deploy
```

## 4) GitHub Actions

Manual workflow is available:

- Workflow: `.github/workflows/post-deploy-verification.yml`
- Trigger: `workflow_dispatch`
- Supports:
  - Post-deploy verification
  - Optional backend load smoke

## 5) Continuous Operations

- Oncall watchdog workflow: `.github/workflows/oncall-watchdog.yml`
- Weekly resilience drill workflow: `.github/workflows/resilience-drill.yml`
