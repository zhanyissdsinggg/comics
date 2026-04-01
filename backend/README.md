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

`Series.author` now remains only as a legacy admin input field. Public creator identity comes from normalized credits, and the storefront `author` field is kept only as a compatibility alias derived from those credits.

Admin series writes still bridge legacy `author` input into normalized credits as a temporary compatibility layer while admin credit editing catches up. That bridge is now isolated to the admin write path instead of the public read path.

Local seed data now creates real `Creator` and `SeriesCredit` rows, and it seeds novel episodes with paragraph payloads so creator discovery and episode detail paths can be exercised without fallback-only fixtures.
It also seeds storefront homepage recommendation slots so a fresh environment does not boot into an empty homepage recommendations state.

## Creator credit import workflow

Do not run the creator import against production with placeholder data.

1. Copy one of the tracked templates:

```bash
Copy-Item data/creator-credits.template.json data/creator-credits.import.json
```

or

```bash
Copy-Item data/creator-credits.template.csv data/creator-credits.import.csv
```

If you want a fillable spreadsheet-style starting point for the current seeded catalog, copy:

```bash
Copy-Item data/creator-credits.catalog-template.csv data/creator-credits.import.csv
```

2. Replace the template rows with real public-facing creator / team / studio credits.

3. Validate the file first:

```bash
npm run creator:import:dry-run -- --file ./data/creator-credits.import.json
```

4. If the dry run passes, execute the write:

```bash
npm run creator:import -- --file ./data/creator-credits.import.json
```

Optional flags:

- `--dry-run`
  - validates the file, series IDs, creator names, roles, and cache targets without writing
- `--no-sync-legacy-author`
  - skips syncing the old `Series.author` compatibility field during import

Environment variables:

- `CREATOR_CREDITS_FILE`
  - optional default import file path when `--file` is not passed
- `CREATOR_IMPORT_SYNC_LEGACY_AUTHOR`
  - set to `0` to disable legacy `author` sync by default

The local import files `data/creator-credits.import.json` and `data/creator-credits.import.csv` are ignored by git so real creator data does not get committed accidentally.

### Safe local test database flow

If your checked-in `.env` points at a shared or production database, override `DATABASE_URL` per command when validating creator imports locally.

Example local PostgreSQL test database:

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/gush_test?sslmode=disable'
npm run prisma:migrate:deploy
npm run seed
npm run creator:import:dry-run -- --file ./data/creator-credits.import.json
npm run creator:import -- --file ./data/creator-credits.import.json
```

After a fake-data validation pass, reset the local test database back to a clean seed state before doing another import run.

## Cache invalidation pipeline

Storefront reads now use a centralized content invalidation layer:

- `ContentCacheInvalidationService.invalidateSeriesContent(...)`
  - invalidates series detail, episode detail, creators, storefront lists, rankings, recommendations, and search read caches when series metadata, episodes, or creator credits change
- `ContentCacheInvalidationService.invalidateDiscoveryConfiguration(...)`
  - invalidates recommendation/ranking/discovery caches when editorial configuration changes
- `ContentCacheInvalidationService.invalidateSearchTelemetry(...)`
  - invalidates hot-search caches when search logs are updated

Admin series writes, admin episode writes/uploads, generated content, recommendation config changes, and search-log writes now all route through this centralized invalidation layer instead of deleting cache patterns ad hoc.
The `creator:import` script now also invalidates Redis-backed storefront caches for imported series so public creator identity updates do not stay stale after a credit import.

## Compatibility notes

- The old schema-drift fallback that retried episode queries without `isDeleted` has been removed from the normal runtime path.
- Legacy commercial fields still exist in the database for internal/admin flows, but the public series/episode read model no longer exposes TTF/pricing fields at the top level.
- If admin author input is retired later, the temporary author-to-credit bridge should be the next compatibility layer deleted.
