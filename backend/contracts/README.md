# OpenAPI Contract Snapshot

This directory stores the canonical backend API contract snapshot used by CI.

- `openapi.snapshot.json`: committed baseline OpenAPI document.

## Commands

- Regenerate snapshot after intentional API changes:
  - `npm run contract:update`
- Validate current code against committed snapshot:
  - `npm run contract:check`

If `contract:check` fails in CI, update the snapshot and include it in the same PR as the API change.
