# Staging Environment Blueprint

This repository is ready for a two-environment deployment model:

- `production`: real users, real payments, real content
- `staging`: deployment preview for admin flows, write APIs, and release rehearsal

## Goals

Use staging for anything that would otherwise mutate production data:

- admin create/update/delete actions
- refunds, billing adjustments, webhook replay
- content generation and batch tools
- promotions, recommendations, email jobs, notification sends

## Recommended Topology

### Railway

Create a second backend service, for example:

- `gush-backend-prod`
- `gush-backend-staging`

The staging backend should use:

- a separate database
- a separate Redis instance if Redis-backed features are enabled
- separate email/provider credentials where possible
- separate webhook endpoints from production

### Vercel

Create a second frontend project or use preview/staging domains, for example:

- `www.gushcomics.com` -> production
- `staging.gushcomics.com` -> staging

Point staging frontend env vars to the staging backend.

## Minimum Environment Separation

At minimum, staging must not share these with production:

- `DATABASE_URL`
- `REDIS_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- payment webhook secrets
- storage buckets if uploads are destructive or user-visible
- email sending credentials if emails can reach real users

## Release Flow

1. Push to `main`
2. Deploy to staging first
3. Run `npm run ops:post-deploy` against staging
4. Run `npm run ops:admin-smoke` against staging
5. Perform any write-flow checks in staging
6. Promote the same commit to production
7. Run `npm run ops:deploy-gate` against production

## Suggested Secrets for CI

For staging workflows, add separate secrets and vars instead of reusing production ones:

- `STAGING_BACKEND_URL`
- `STAGING_FRONTEND_URL`
- `STAGING_ADMIN_KEY`
- `STAGING_OBSERVABILITY_KEY`

## What This Solves

A proper staging environment catches exactly the class of issues that are risky to test in production:

- logout/session invalidation regressions
- admin page runtime crashes
- write endpoint contract drift
- background job and email misconfiguration
- billing/admin mutation regressions

## Current Safe Default

If staging is not provisioned yet, use the production-safe deploy gate already in this repo:

```bash
BACKEND_URL=https://comics-production-07fa.up.railway.app \
FRONTEND_URL=https://www.gushcomics.com \
EXPECT_BACKEND_COMMIT=<commit-sha> \
OPS_ADMIN_KEY=<production-admin-key> \
npm run ops:deploy-gate
```

That does not replace staging, but it meaningfully reduces the chance of shipping broken admin auth or dead frontend routes.
