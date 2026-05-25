# Interactive Story Production Release Checklist

Use this checklist when releasing the Interactive Stories stack itself, not just one story.

This runbook covers:

- Prisma migrations
- backend and frontend release verification
- admin runtime requirements
- normal/adult mode isolation
- AI assist release safety
- AI comic panel review safety
- rollback readiness

## 1. Release Scope

Confirm which of the following are included in the release:

- Interactive Stories public routes
- admin interactive story authoring
- AI Assist draft-node generation
- AI comic panel storyboard and panel review
- content mode isolation changes
- schema or migration changes

Record:

- target git SHA:
- target frontend revision:
- target backend commit:
- release operator:
- staging URL:
- production URL:

## 2. Required Environment Variables

Backend runtime must be configured with, at minimum:

```env
DATABASE_URL=postgresql://...
FRONTEND_ORIGIN=https://...
JWT_SECRET=...
ENABLE_ADMIN_RUNTIME=1
INTERACTIVE_AI_ENABLED=1
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://...
OPENAI_MODEL=...
```

If AI Assist is intentionally disabled for launch, record that explicitly and verify:

- `INTERACTIVE_AI_ENABLED=0`
- admin UI behavior is still safe
- public reading routes still work

Production rules:

- never share staging and production `DATABASE_URL`
- never share staging and production admin credentials
- do not commit real API keys

Reference docs:

- [interactive-stories-ai-assist-smoke-test.md](./interactive-stories-ai-assist-smoke-test.md)
- [staging-environment-blueprint.md](./staging-environment-blueprint.md)

## 3. Database and Migration Gate

Before release:

1. Ensure the target environment has `DATABASE_URL` configured.
2. Check migration status:

```powershell
npm --prefix backend run prisma:migrate:status
```

3. Apply audited migrations:

```powershell
npm --prefix backend run prisma:migrate:deploy
```

4. Regenerate Prisma client if your deployment flow requires it.

Interactive-story-related migrations currently expected in this repo:

- `20260421130000_add_interactive_story_mvp`
- `20260523103000_extend_interactive_story_mvp_for_public_routes`
- `20260523143000_add_interactive_story_ai_assist`
- `20260523190000_add_interactive_story_panels`

Release must stop if:

- migration status is unknown
- pending migrations cannot be applied cleanly
- production schema differs from committed migration history

## 4. Backend Verification Gate

Run these before deployment or against the release candidate:

```powershell
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend run contract:check
npm --prefix backend test -- --runInBand src/modules/interactive-stories/interactive-stories.controller.spec.ts src/modules/interactive-stories/interactive-stories.service.spec.ts src/modules/admin/controllers/admin-interactive-stories.controller.spec.ts src/modules/admin/controllers/admin-interactive-panels.controller.spec.ts
```

Expected:

- no lint errors
- no type errors
- build succeeds
- OpenAPI contract check passes
- Interactive controller/service/admin tests pass

## 5. Frontend Verification Gate

At minimum, run:

```powershell
npm --prefix frontend run build:e2e
$env:PLAYWRIGHT_USE_PREBUILT='1'
npx --prefix frontend playwright test
```

High-signal suites that must stay green:

- `tests/e2e/content-mode.spec.ts`
- `tests/e2e/public-reading-funnel.spec.ts`
- `tests/e2e/auth-required.spec.ts`
- `tests/e2e/admin-system-pages.spec.ts`

Release must stop if:

- `/interactive` leaks adult content in normal mode
- `/interactive/[slug]/play` exposes unapproved draft nodes
- admin interactive review flows fail

## 6. Story Data Safety Gate

For every story shipping publicly:

- story `slug`, `title`, and `contentMode` are correct
- public path uses only approved nodes
- `initialNodeId` is valid
- non-ending public nodes have at least one valid choice
- empty or draft branches are not reachable publicly

Use:

- [interactive-story-launch-checklist.md](./interactive-story-launch-checklist.md)

## 7. Normal / Adult Isolation Gate

This is a hard blocker, not a soft QA item.

Verify all of the following:

- normal mode lists only `contentMode=normal` interactive stories
- adult mode lists only `contentMode=adult` interactive stories
- detail routes do not leak wrong-mode title, cover, tags, or metadata
- play routes do not leak wrong-mode node content
- recommendations, search, and discovery links remain mode-safe
- panel assets generated for adult stories never appear in normal mode

Evidence sources:

- `tests/e2e/content-mode.spec.ts`
- `tests/e2e/public-reading-funnel.spec.ts`

## 8. AI Assist Release Gate

For admin AI draft generation:

- generated nodes are saved as draft or `pending_review`
- generated content is never auto-published
- generation logs are written
- log content stays isolated by `contentMode`
- normal-mode generation remains teen-safe
- approved status can be applied only through review flow

Run staging smoke:

1. Open admin interactive nodes workspace.
2. Generate one node from an existing choice.
3. Confirm the generated node appears as `pending_review`.
4. Approve the node.
5. Bind the approved node to the intended branch.
6. Confirm public routes still only expose approved content.

Reference:

- [interactive-stories-ai-assist-smoke-test.md](./interactive-stories-ai-assist-smoke-test.md)

## 9. AI Comic Panel Release Gate

For panel generation and review:

- storyboard JSON is generated per node
- panel prompt metadata is saved completely
- images do not bake dialogue text into the raster asset
- generated images stay in review until approved
- regenerate, approve, and reject all work
- `finalImageUrl` override works before approval
- normal/adult assets remain isolated

Recommended smoke flow:

1. Generate storyboard for one approved test node.
2. Generate 1-3 panel drafts.
3. Reject one panel and regenerate it.
4. Approve one panel after setting `finalImageUrl`.
5. Confirm only approved assets are eligible for public rendering.

## 10. Staging Deployment Verification

Before production, deploy the same release candidate to staging and run:

```powershell
BACKEND_URL=<staging-backend-url> `
FRONTEND_URL=<staging-frontend-url> `
EXPECT_BACKEND_COMMIT=<sha> `
EXPECT_FRONTEND_COMMIT=<sha> `
EXPECT_FRONTEND_REPO=<owner/repo> `
OPS_ADMIN_KEY=<staging-admin-key> `
npm run ops:deploy-gate
```

Then perform manual staging smoke for:

- admin login
- interactive story publish
- AI Assist node generation and approval
- panel review flow
- normal/adult route separation

## 11. Production Deployment Verification

Immediately after production deploy, run:

```powershell
BACKEND_URL=https://comics-production-07fa.up.railway.app `
FRONTEND_URL=https://www.gushcomics.com `
EXPECT_BACKEND_COMMIT=<sha> `
EXPECT_FRONTEND_COMMIT=<sha> `
EXPECT_FRONTEND_REPO=<owner/repo> `
OPS_ADMIN_KEY=<production-admin-key> `
npm run ops:deploy-gate
```

Then manually verify:

1. `/interactive`
2. one normal interactive detail page
3. one normal interactive play route
4. one adult interactive detail page in adult mode only
5. one admin AI Assist generate-and-approve path
6. one admin panel review path

## 12. Rollback Readiness

Before release, confirm:

- previous known-good SHA is recorded
- rollback operator is identified
- rollback playbook location is known
- database rollback plan is understood if schema changes are included

Reference:

- [rollback-playbook.md](./rollback-playbook.md)

If production validation fails:

1. stop further publish actions
2. disable public publishing for affected stories if needed
3. roll back frontend and backend to the previous known-good SHA
4. rerun deploy gate against the rollback target

## 13. Final Sign-off Template

Record this before and after production release:

- Release date:
- Release SHA:
- Frontend revision verified: yes/no
- Backend commit verified: yes/no
- Prisma migration status verified: yes/no
- Staging deploy gate passed: yes/no
- Production deploy gate passed: yes/no
- Interactive public smoke passed: yes/no
- AI Assist smoke passed: yes/no
- AI panel review smoke passed: yes/no
- Normal/adult isolation passed: yes/no
- Rollback target recorded: yes/no
- Remaining risks:
- Final approver:
