# Gush Monorepo

Production monorepo for the Gush comics-and-novels platform.

This repository is organized around two live apps:

- `frontend/`: public reading site built with Next.js
- `backend/`: NestJS + Prisma API, admin runtime, and operational tooling

The repo has already been cleaned up to remove stale landing-page experiments, orphaned scripts, and generated artifacts. Keep it that way: do not commit build output, temporary import files, test result folders, or one-off local reports.

## Repository layout

```text
.
|-- frontend/              Public storefront and reading experience
|-- backend/               API, admin runtime, Prisma schema, seed/import scripts
|-- docs/                  Operational runbooks and reference notes
|-- ops/                   Alerting and operations assets
|-- scripts/               Cross-repo automation, audits, and deployment checks
|-- security/              Security policies and supporting material
|-- vercel.json            Frontend deployment configuration
```

## Common commands

Run these from the repository root unless noted otherwise.

### Daily development

```bash
npm run dev
```

Starts the frontend dev server from `frontend/`.

```bash
npm run init-db
```

Runs the backend seed flow.

### Validation

```bash
npm run lint
```

Runs frontend and backend lint checks.

```bash
npm run build
```

Builds the frontend first, then the backend.

```bash
npm run smoke:routes
```

Runs the root storefront route smoke by delegating to the existing frontend route smoke suite.

```bash
BACKEND_URL=https://comics-production-07fa.up.railway.app \
OPS_ADMIN_KEY=<production-admin-key> \
OPS_ADMIN_WRITE_ALLOWED=1 \
OPS_ADMIN_WRITE_REMOTE_ALLOWED=1 \
OPS_ADMIN_WRITE_PROD_ALLOWED=1 \
npm run ops:admin-write-smoke
```

Runs the reversible admin QA-user write smoke:

- logs into the live admin backend
- finds an allowlisted QA account under `@example.com`
- blocks the QA account, verifies the state change, then restores the original state
- creates one QA-only notification, verifies it appears in the admin list, then deletes it
- refuses to run unless `OPS_ADMIN_WRITE_ALLOWED=1` is set
- refuses to run against non-local targets unless `OPS_ADMIN_WRITE_REMOTE_ALLOWED=1` is set
- refuses to run against production hosts unless `OPS_ADMIN_WRITE_PROD_ALLOWED=1` is set

Optional after the support reply migration/runtime is deployed:

```bash
BACKEND_URL=https://comics-production-07fa.up.railway.app \
OPS_ADMIN_KEY=<production-admin-key> \
OPS_ADMIN_WRITE_ALLOWED=1 \
OPS_ADMIN_WRITE_REMOTE_ALLOWED=1 \
OPS_ADMIN_WRITE_PROD_ALLOWED=1 \
OPS_ADMIN_WRITE_SUPPORT=1 \
npm run ops:admin-write-smoke
```

That adds one disposable QA support roundtrip:

- creates a guest support ticket under `@example.com`
- verifies the ticket appears in admin support with `includeTestData=1`
- replies to it, verifies the saved admin reply, closes it, then deletes it

```bash
npm run ops:release:all-live:fast
```

Runs the fast release autopilot (baseline strict live gate is blocking; full strict gate is optional).

```bash
npm run ops:release:all-live:strict
```

Runs strict autopilot (baseline + full strict gate are both mandatory).

```bash
npm run check:all
```

Runs the full repository verification pass:

- frontend lint/build/perf/smoke checks
- backend lint/typecheck/build/tests
- shared security and hygiene checks

## Frontend workspace

Main path: [`frontend/`](./frontend)

Useful commands:

```bash
cd frontend
npm run dev
npm run lint
npm run build
npm run build:e2e
npm run test:e2e
npm run smoke:routes
```

The storefront is the public product surface. Keep UI experiments inside the existing component system instead of creating parallel one-off components.

Current homepage asset note:

- `frontend/public/images/home/` stores the curated homepage artwork mapped to `The Last Kingdom`, `Crimson Tide`, `Cherry Blossom High`, `Wild Hearts`, `Solar Wind`, and the `Interactive Stories` spotlight so the storefront hero and priority rails use fixed local assets instead of placeholder covers.

Playwright note:

- Browser E2E uses a prebuilt `.next-playwright/` bundle before starting `next start`
- This avoids Windows file-lock and partial-build failures when Playwright tries to build and boot the app in one step

Storefront and Mature Mode guardrails:

- Public home, search, rankings, library, comics, novels, and creator surfaces must keep mature catalog entries hidden by default.
- `/adult`, `/adult-gate`, and `/mature-content` stay within the existing route structure and must remain `noindex`.
- Mature access is decided server-side from session plus verification state, not from a raw `adult=1` query flag alone.
- Mature reading history and mode state stay isolated from the public library and public search flows.

## Backend workspace

Main path: [`backend/`](./backend)

Useful commands:

```bash
cd backend
npm run start:dev
npm run lint
npm run typecheck
npm run build
npm run prisma:generate
npm run prisma:migrate:deploy
```

Migration policy:

- `prisma db push` is local-only via `npm run prisma:push:local`
- audited deploys must use `npm run prisma:migrate:deploy`

Backend runtime details, creator import flow, and cache invalidation notes live in [`backend/README.md`](./backend/README.md).

## Deployment configuration

Production split:

- Vercel serves the Next.js storefront from `frontend/` only
- Railway serves the NestJS API from `backend/` only
- Root `vercel.json` exists so monorepo builds from the repo root still install and build only `frontend/`
- Use `npm ci` everywhere in CI and deployment automation so the committed `package-lock.json` files stay authoritative

These files are live infrastructure inputs and should not be deleted as "unused":

- [`vercel.json`](./vercel.json): frontend deployment behavior
- [`backend/railway.json`](./backend/railway.json): backend Railway configuration
- [`frontend/railway.json`](./frontend/railway.json): frontend Railway configuration
- [`backend/nixpacks.toml`](./backend/nixpacks.toml): backend build/runtime settings

## Docs index

Operational docs live in [`docs/operations/`](./docs/operations):

- `admin-route-inventory.md`: admin route reference
- `deploy-gate-automation.md`: deployment gate automation notes
- `staging-environment-blueprint.md`: staging environment layout
- `staging-admin-write-regression-checklist.md`: admin regression checklist
- `rollback-playbook.md`: rollback steps
- `oncall-playbook.md`: incident handling notes
- `slo-and-alerts.md`: service targets and alert expectations
- `chaos-and-security-drill.md`: resilience/security drill guidance

Additional reference docs:

- [`docs/README.md`](./docs/README.md): repository documentation index
- [`backend/contracts/README.md`](./backend/contracts/README.md): API contract snapshot workflow
- [`docs/demo-cover-sources.md`](./docs/demo-cover-sources.md): demo cover asset provenance
- [`ops/README.md`](./ops/README.md): operations asset index
- [`security/README.md`](./security/README.md): security allowlist index

## Repository hygiene rules

- Do not commit `.next/`, local report folders, or temporary smoke-test output
- Do not commit real creator import data; use the tracked templates under `backend/data/`
- Prefer updating the shared scripts under `scripts/` instead of creating ad hoc local helpers
- If a file is not imported by code, check deployment, contracts, docs, and seed workflows before deleting it

## Suggested maintenance workflow

When cleaning the repo in future passes:

1. Verify whether a file is referenced by code, scripts, deployment config, or docs.
2. Remove only true orphaned files, not infrastructure inputs.
3. Re-run `npm run lint` and `npm run build`.
4. Keep the root README current when commands, folder roles, or deployment flows change.

Railway redeploy trigger: refresh build cache.
