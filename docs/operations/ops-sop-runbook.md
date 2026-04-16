# OPS SOP Runbook

This runbook defines the production-grade acceptance cadence for the Gush frontend + backend stack.

## Required Environment Variables

Set these before running any SOP profile:

- `BACKEND_URL` (example: `https://www.gushcomics.com`)
- `FRONTEND_URL` (example: `https://www.gushcomics.com`)
- `OPS_ADMIN_EMAIL`
- `OPS_ADMIN_PASSWORD`
- `OPS_ADMIN_WRITE_ALLOWED=1` (required for write probes)

Required for strict deploy gate profile:

- `OBSERVABILITY_KEY`

Optional support-write probe:

- `OPS_ADMIN_WRITE_SUPPORT=1`
- `OPS_ADMIN_WRITE_SUPPORT_REQUIRED=1` (make support write roundtrip blocking)

## SOP Profiles

### 1) Daily Operations Check

Run:

```bash
npm run ops:sop:daily
```

Includes:

- `ops:admin-ui-live`
- `ops:admin-smoke`
- `ops:admin-write-smoke`

Goal:

- Validate core operator flows, admin session boundaries, and reversible QA writes.
- Runner retries each script once by default (`OPS_SOP_RETRY_TIMES=1`) to absorb transient network jitter.

### 2) Deploy Gate + High-Risk Writes

Run:

```bash
npm run ops:sop:deploy
```

Includes:

- `ops:deploy-gate:strict:full`
- `ops:admin-high-risk-write-smoke`
- `ops:admin-sensitive-write-smoke`
- `ops:admin-content-write-smoke`

Goal:

- Enforce release gate and verify high-risk business write paths with cleanup.

### 3) Weekly Deep Reliability Sweep

Run:

```bash
npm run ops:sop:weekly
```

Includes:

- `ops:admin-routes`
- `ops:admin-schema-audit`
- `ops:load-smoke`
- `ops:chaos-drill`
- `ops:rollback-verify`

Goal:

- Refresh route inventory, schema drift posture, load behavior, chaos resilience, and rollback confidence.

## GitHub Automation

Workflow:

- `.github/workflows/ops-sop-automation.yml`

Automatic schedule:

- Daily profile at `01:00 UTC`
- Weekly profile at `02:30 UTC` on Monday

Manual dispatch:

1. Open GitHub Actions -> `OPS SOP Automation`
2. Click `Run workflow`
3. Select `profile` (`daily` / `deploy` / `weekly`)
4. Optionally override backend/frontend URLs

Required repo configuration:

- `vars.PROD_BACKEND_URL` (optional if using default domain)
- `vars.PROD_FRONTEND_URL` (optional if using default domain)
- `secrets.OBSERVABILITY_KEY` (required for deploy profile)
- Admin auth (one of):
  - `secrets.PROD_ADMIN_KEY` (or `secrets.ADMIN_KEY`)
  - `secrets.PROD_ADMIN_EMAIL` + `secrets.PROD_ADMIN_PASSWORD`

## Failure Handling

When a profile fails:

1. Capture failing command output.
2. Stop further production mutations.
3. Open a fix branch and patch the exact failure.
4. Re-run the same profile until it passes.
5. Re-run `ops:sop:deploy` before release if any production-facing logic changed.

## Notes

- `scripts/ops/sop-runner.mjs` executes scripts sequentially to avoid conflicting write probes.
- Override retry count with `OPS_SOP_RETRY_TIMES=<n>` (default `1`).
- Write smoke tests are designed to be reversible; cleanup runs even when intermediate assertions fail.
- Treat any new `5xx` from admin mutation routes as a release blocker until fixed and re-verified.
