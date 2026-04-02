# Production Admin Schema Repair Runbook

Use this runbook when the deployed backend is already on the latest code, but the production database is still missing admin/support schema pieces.

Current target repairs:

- apply pending Prisma migration `20260331170000_add_admin_members`
- apply pending Prisma migration `20260402033000_repair_support_tickets_optional_columns`

This runbook is production-oriented. Do not use `prisma db push`.

## 1) Preconditions

- latest backend code is deployed or ready to deploy
- you have access to the correct production environment variables
- you have a fresh database backup or Neon branch snapshot
- you have at least one valid admin key
- you understand that this changes the production schema

## 2) Preflight Audit

Run the schema audit before touching migrations:

```bash
npm run ops:admin-schema-audit
```

Expected before repair on the currently observed production-like database:

- `admin_members_exists=false`
- `missing_support_ticket_optional_columns=replyEmail,orderId,topic`

Then confirm Prisma migration status:

```bash
npm --prefix backend run prisma:migrate:status
```

Expected before repair:

- pending `20260331170000_add_admin_members`
- pending `20260402033000_repair_support_tickets_optional_columns`

## 3) Safe Execution Order

1. Verify the target database URL one more time.
2. Take backup / snapshot.
3. Apply migrations.
4. Re-check schema state.
5. Run admin session smoke.
6. Run targeted admin route checks.

## 4) Apply Migrations

Run this in the real deployment/runtime environment:

```bash
npm --prefix backend run prisma:migrate:deploy
```

Do not substitute:

- do not use `prisma db push`
- do not run ad hoc manual SQL first unless rollback or incident recovery requires it

## 5) Post-Migration Verification

Re-check migration status:

```bash
npm --prefix backend run prisma:migrate:status
```

Expected:

- no pending migrations

Re-run schema audit:

```bash
OPS_SCHEMA_REQUIRED=1 npm run ops:admin-schema-audit
```

Expected:

- `admin_members_exists=true`
- `missing_support_ticket_optional_columns=(none)`
- exit code `0`

## 6) Admin Runtime Acceptance

Run the production-safe admin smoke after the schema repair:

```bash
BACKEND_URL=https://<your-backend-domain> \
OPS_ADMIN_KEY=<production-admin-key> \
npm run ops:admin-smoke
```

Expected:

- unauthorized admin reads return `401/403`
- login returns `200/201`
- verify succeeds before logout
- read-only admin routes return `200`
- append-only audit delete probe returns `403`
- logout succeeds
- verify/refresh fail after logout

## 7) Manual Acceptance Checks

After smoke passes, verify these routes from the live admin UI:

- `/admin/login`
- `/admin`
- `/admin/support`
- `/admin/users`
- `/admin/orders`
- `/admin/series`
- `/admin/settings`

API checks worth confirming directly:

- `GET /api/admin/members`
- `GET /api/admin/members/meta`
- `POST /api/admin/members`
- `GET /api/admin/support?page=1&pageSize=1`

Expected after repair:

- admin members are backed by the real `admin_members` table
- admin member write endpoints no longer return migration-related `503`
- support list no longer depends on compatibility fallback for missing `replyEmail/orderId/topic`

## 8) Rollback Trigger Conditions

Pause and roll back if any of these happen:

- `prisma migrate deploy` fails partway through
- admin login starts returning `500`
- `/api/admin/members` returns `500`
- `/api/admin/support` returns `500`
- post-migration schema audit still reports missing columns

Use the existing rollback guide if rollback is required:

- [rollback-playbook.md](./rollback-playbook.md)

## 9) Current Reality

Before this repair, the codebase is already runtime-compatible with the older database:

- admin login falls back to env-only mode when `admin_members` is missing
- admin support routes degrade cleanly when `support_tickets` optional columns are missing

That compatibility is a safety net, not the target end state.

The target end state is:

- database matches Prisma migration history
- `admin_members` exists
- `support_tickets.replyEmail/orderId/topic` exist
- admin runtime no longer relies on those compatibility fallbacks during normal operation
