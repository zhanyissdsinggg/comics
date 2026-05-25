# Interactive Stories AI Assist Smoke Test

## Purpose

This note captures the current local smoke-test path for the Interactive Stories AI Assist flow in the admin console.

Scope covered by this smoke test:

- Generate next node from an existing choice
- Save AI output as draft content instead of public content
- Review and approve the generated node
- Attach the approved AI node back to the original branch choice
- Verify normal-mode teen-safe generation and logging behavior

## Local Config

Backend config file:

- `backend/.env.local`

Required local variables for the current working setup:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/gush_test?sslmode=disable
FRONTEND_ORIGIN=http://127.0.0.1:3000
PORT=4000
JWT_SECRET=test-jwt-secret-keep-it-long-enough-for-validation
ADMIN_PASSWORD_AUTH_ENABLED=1
ENABLE_ADMIN_RUNTIME=1
INTERACTIVE_AI_ENABLED=1
OPENAI_BASE_URL=https://www.packyapi.com/v1
OPENAI_MODEL=gpt-5.4-mini
OPENAI_API_KEY=...
```

Notes:

- `OPENAI_MODEL=gpt-5.4-mini` is the currently verified working model for the third-party compatible endpoint.
- `backend/.env.local` is ignored by git via the repo-level `.gitignore`.
- Do not commit or share real API keys.

## Local Runtime

Current expected local URLs:

- frontend: `http://127.0.0.1:3000`
- backend: `http://127.0.0.1:4000`

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:4000/health"
```

Expected result:

- HTTP 200
- JSON body with `"ok": true`

## Admin Test Account

Current local admin account used during smoke testing:

- email: `admin@example.com`
- password: `Password123!`

## Test Story

Current local sample story:

- story id: `story-solar-wind-001`
- slug: `solar-wind-first-contact`

Primary admin page:

- `http://127.0.0.1:3000/admin/interactive-stories/story-solar-wind-001/nodes`

## Verified Flow

The following path has been verified end-to-end in the admin UI:

1. Open the admin interactive story nodes page.
2. Find the existing branch choice:
   - `Run a deep scan before moving.`
3. Click `Generate Next Node`.
4. Confirm a new AI node is created in pending review state.
5. Change `Review Status` to `approved`.
6. Save the node.
7. Click `绑定分支` to attach the approved node back to the original branch.
8. Confirm the original branch target updates to the new AI node.

## Latest Verified Result

Latest verified generated node:

- title: `Signal Under Glass`
- generatedByAI: `true`
- reviewStatus: `approved`
- model: `gpt-5.4-mini`

Latest verified branch attachment:

- choice label: `Run a deep scan before moving.`
- target node: `Signal Under Glass`

## Expected Safety Behavior

For `contentMode=normal`, expected behavior:

- generation log stays in normal mode only
- teen-safe content only
- no adult sexual content
- no explicit content
- no public release before approval

Expected admin behavior:

- newly generated AI node starts as `pending_review`
- unapproved AI nodes cannot be attached to a public choice target
- approving the node updates the related generation log review status

## Expected Failure Modes

Common failure codes observed during setup:

- `missing-openai-api-key`
  - cause: key not configured or not actually loaded into runtime
- `openai-http-401`
  - cause: invalid key, wrong token group, or provider rejected auth
- `invalid-draft-node-json`
  - cause: upstream returned content that did not match required JSON shape

## Quick Troubleshooting

If generation fails:

1. Check backend health on port `4000`.
2. Confirm `backend/.env.local` contains the intended model and key.
3. Restart backend after changing env values.
4. Retry from the admin nodes page.
5. Inspect the latest `AI Generation Logs` row in admin.
6. Inspect `backend/backend-final.log` for the corresponding `generate-node` request.

If the UI still shows old runtime errors:

1. Restart the frontend dev server
2. Reload the admin page

## Related Files

- `backend/.env.local`
- `backend/src/modules/admin/controllers/admin-interactive-stories.controller.ts`
- `backend/src/modules/admin/controllers/admin-interactive-stories.controller.spec.ts`
- `backend/src/modules/interactive-stories/interactive-ai.service.ts`
- `frontend/components/admin/AdminInteractiveStoriesPage.jsx`

