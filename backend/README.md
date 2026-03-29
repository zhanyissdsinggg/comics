# Gush Backend

This service powers the production reading platform for Gush comics and novels.

## Runtime shape

- `CorePublicRuntimeModule`: public catalog, creators, search, recommendations, rankings, episode reads
- `UserRuntimeModule`: auth, preferences, reading progress, follows, comments, notifications
- `CommercialRuntimeModule`: entitlements, wallet, orders, payments, subscriptions, coupons, promotions
- `OpsRuntimeModule`: email retry worker, events, tracking, rewards, missions
- `AdminRuntimeModule`: admin-only controllers and tooling

Optional runtime groups are now gated at bootstrap:

- `ENABLE_COMMERCIAL_RUNTIME=0` disables commercial modules
- `ENABLE_OPS_RUNTIME=0` disables ops/background modules
- `ENABLE_ADMIN_RUNTIME=0` disables the admin runtime

## Prisma workflow

Production deploys must use migrations, not `db push`.

### Local schema iteration

```bash
npm run prisma:push:local
```

Use this only for throwaway local iteration.

### Generate a new migration in development

```bash
npm run prisma:migrate:dev -- --name your_change_name
```

### Apply audited migrations in CI / production

```bash
npm run prisma:migrate:deploy
```

### Check migration status

```bash
npm run prisma:migrate:status
```

## Migration adoption note

This repository previously relied on `prisma db push`, so migration history must be baselined before the first production `migrate deploy`.

Committed migrations for this stabilization pass:

1. `20260301000000_baseline`
2. `20260328153000_add_series_author`
3. `20260329120000_backend_stabilization`

For an existing environment that already has the schema:

1. Resolve `20260301000000_baseline` as applied.
2. Resolve `20260328153000_add_series_author` as applied if the column already exists.
3. Run `npm run prisma:migrate:deploy` so `20260329120000_backend_stabilization` applies normally.

## Creator credits foundation

Creator identity is now normalized through:

- `Creator`
- `SeriesCredit`

`Series.author` remains as a transitional source field, but public creator identity should come from normalized credits wherever available.

Admin series writes sync the legacy author field into normalized credits so new titles do not regress to string-only attribution.

Local seed data now creates real `Creator` and `SeriesCredit` rows, and it seeds novel episodes with paragraph payloads so creator discovery and episode detail paths can be exercised without fallback-only fixtures.
