# Interactive Story Launch Checklist

Use this checklist before publishing one interactive story to staging or production.

This checklist is story-specific. For the full release checklist that covers migrations,
environment variables, AI review, panel review, deploy gates, and rollback, use:

- [interactive-story-production-release-checklist.md](./interactive-story-production-release-checklist.md)

Scope:

- story graph validity
- public read-path safety
- review-state safety
- mode isolation
- AI fallback resilience

## 1. Content Graph Integrity

- Story has a non-empty `slug` and `title`.
- Story has at least one node.
- `initialNodeId` points to an existing node.
- Every non-ending node has at least one choice.
- Every required public choice target points to an existing node.
- No duplicated `nodeKey` inside one story.
- No duplicated `choiceKey` inside one node.

How to verify:

1. Open `/admin/interactive-stories`.
2. Select the target story.
3. Run validation from the admin workspace.
4. Confirm the result shows:
   - `Errors 0`
   - warnings reviewed and explicitly accepted

## 2. Review and Publish Gate

- Story status is intentionally set for the release target.
- Public nodes are `approved`.
- Draft or `pending_review` AI nodes are not exposed through public reading routes.
- Draft or rejected panel assets are not exposed to public readers.

How to verify:

1. In admin, confirm each public-facing node is approved.
2. Confirm generated AI nodes still waiting for review are not attached to public branches unless approved.
3. Attempt publish in admin.
4. If blocked, fix all validation errors first.

Expected:

- `POST /api/admin/interactive-stories/:id/publish` returns `200`.
- Story `isPublished=true` in the admin list.

## 3. Frontend Read-Path Smoke

- Open the public story detail route.
- Confirm the expected title, description, and cover render.
- Enter play mode.
- Confirm the initial node loads.
- Confirm 2-3 reader choices render where expected.
- Click one choice and verify:
  - node text changes
  - next choices update
  - no crash
- Refresh the page and confirm progress resumes correctly for signed-in users.

## 4. Content Mode Isolation

- `normal` mode only shows `contentMode=normal` interactive stories.
- `adult` mode only shows `contentMode=adult` interactive stories.
- A `normal` session cannot discover or play adult stories.
- An `adult` session cannot accidentally read `normal`-only interactive content if the product requirement is strict separation.

How to verify:

1. Test `/interactive` in normal mode.
2. Test `/interactive` in adult mode.
3. Test `/interactive/[slug]` for both a normal story and an adult story.
4. Test `/interactive/[slug]/play` for both modes.

Expected:

- wrong-mode access is blocked or non-discoverable
- no adult metadata leaks into normal mode

## 5. AI Degrade Safety

- Disable the AI key in staging, or point the model to an unreachable target.
- Submit one story choice that relies on generated continuation.
- Confirm fallback text is returned and the UI stays usable.
- Re-enable AI and verify normal generation recovers.

Expected:

- no frontend white screen
- API still returns a valid progress payload
- generation log records a failure, fallback, or skipped path

## 6. Import / Export Safety

- Export one known-good story JSON.
- Re-import it in staging using the intended mode.
- Run validation again.
- Confirm node and choice counts match expectations.

Recommended baseline template:

- [interactive-story-import-template.json](./interactive-story-import-template.json)

## 7. Release Sign-off

Record this before go-live:

- Story slug:
- Content mode:
- Admin operator:
- Validation result:
- Publish result:
- Frontend smoke result:
- Mode-isolation result:
- AI fallback result:
- Import/export roundtrip result:
- Open risks:
- Approved for release: yes/no
