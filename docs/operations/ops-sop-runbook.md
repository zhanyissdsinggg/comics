# OPS SOP Runbook

This runbook defines the production-grade acceptance cadence for the Gush frontend + backend stack.

## Required Environment Variables

Set these before running any SOP profile:

- `BACKEND_URL` (example: `https://www.gushcomics.com`)
- `FRONTEND_URL` (example: `https://www.gushcomics.com`)
- `OPS_ADMIN_EMAIL`
- `OPS_ADMIN_PASSWORD`
- `OPS_ADMIN_WRITE_ALLOWED=1` (required for write probes)

Required for strict full deploy gate profile:

- `OBSERVABILITY_KEY`

If you want a quick live strict gate without manually exporting URLs:

```bash
npm run ops:deploy-gate:strict:live
```

This command auto-targets `https://www.gushcomics.com` for both backend/frontend unless overridden by environment variables.

For one-command release readiness (baseline + optional full strict gate):

```bash
npm run ops:release:ready-live
```

Behavior:

- always runs `ops:deploy-gate:strict:live` (blocking)
- runs `ops:deploy-gate:strict:full` only when both `OBSERVABILITY_KEY` and admin credentials are present
- default mode is **fast** (`fullGatePolicy=optional`)
- report includes `thresholdTier=baseline-default`
- retries each gate once by default to absorb transient network jitter (`OPS_RELEASE_RETRY_TIMES`, default `1`)
- writes release reports to `ops-release-ready-report.json` and `ops-release-ready-report.md`

Optional strictness:

- set `OPS_RELEASE_REQUIRE_FULL=1` to make full strict gate mandatory (fail if prerequisites are missing)
- or run `npm run ops:release:ready-live:full` (cross-platform shortcut, same behavior)
- strict mode is reported as `mode=strict` with `fullGatePolicy=required`
- strict mode report sets `thresholdTier=strict-p2`

After `ops:release:ready-live`, generate a concise release summary:

```bash
npm run ops:release:summary
```

Summary outputs:

- `ops-release-summary.json`
- `ops-release-summary.md`

Generate an operator-facing short brief:

```bash
npm run ops:release:brief
```

Brief output:

- `ops-release-brief.md`

Generate a release trend dashboard (reads history + latest summary):

```bash
npm run ops:release:dashboard
```

Dashboard output:

- `ops-release-dashboard.md`

Single-command full flow (recommended for daily release checks):

```bash
npm run ops:release:all-live
```

This runs `ops:release:ready-live`, `ops:release:summary`, and `ops:release:brief`, then prints final summary verdict in terminal.
It also exits non-zero when summary verdict is not `READY`.
By default it also archives release artifacts under `ops-release-history/` (disable with `OPS_RELEASE_ARCHIVE=0`).
It also prunes release history after archiving (default keep last `30`, override with `OPS_RELEASE_HISTORY_KEEP`),
and regenerates `ops-release-dashboard.md`.

Mode aliases:

- fast mode: `npm run ops:release:all-live:fast`
- strict mode: `npm run ops:release:all-live:strict`

Alias:

```bash
npm run ops:release:autopilot
```

Manual archive command (if needed):

```bash
npm run ops:release:archive
```

Manual history prune command (if needed):

```bash
npm run ops:release:history:prune
```

To force full strict gate in the same one-command flow:

```bash
npm run ops:release:all-live:full
```

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
- `secrets.OBSERVABILITY_KEY` (required)
- Admin auth for advisory checks (optional in soft mode):
  - `secrets.PROD_ADMIN_EMAIL` + `secrets.PROD_ADMIN_PASSWORD`
  - fallback: `secrets.ADMIN_EMAIL` + `secrets.ADMIN_PASSWORD`

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
