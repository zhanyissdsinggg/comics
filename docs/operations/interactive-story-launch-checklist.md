# Interactive Story Launch Checklist

Use this checklist before publishing an interactive story to production.

Scope:

- story graph validity
- admin workflow safety
- user read-path correctness
- AI fallback resilience

## 1) Content Graph Integrity

- Story has a non-empty `slug` and `title`.
- Story has at least one node.
- `initialNodeId` points to an existing node.
- Every non-ending node has at least one choice.
- Every choice target points to an existing node (or is intentionally empty and approved).
- No duplicated `nodeKey` inside one story.
- No duplicated `choiceKey` inside one node.

How to verify:

- Open `/admin/interactive-stories`
- Select story
- Run `健康检查`
- Result must show:
  - `错误 0`
  - Warnings reviewed and explicitly accepted

## 2) Publish Gate Validation

- Attempt publish in admin UI.
- If blocked, fix all validation errors first.
- Publish succeeds only after graph passes.

Expected:

- `POST /api/admin/interactive-stories/:id/publish` returns 200.
- Story `isPublished=true` in admin list.

## 3) Frontend Read-Path Smoke

- Open series page with interactive story entry.
- Enter interactive mode.
- Confirm initial segment loads.
- Confirm 2-4 choices render.
- Click one choice and verify:
  - text changes
  - next choices update
  - no crash
- Refresh page and confirm progress resumes from last node.

## 4) AI Degrade Safety

- Temporarily disable AI key in staging or set model unreachable.
- Submit one choice.
- Confirm fallback text is returned and UI stays usable.
- Re-enable AI and verify normal generation recovers.

Expected:

- no frontend white screen
- API still returns a valid progress payload
- generation log records `fallback` or `skipped`

## 5) Import / Export Safety

- Export one known-good story JSON.
- Re-import into staging using `replace` mode.
- Run validation again.
- Confirm node and choice counts match expected values.

Recommended baseline template:

- `docs/operations/interactive-story-import-template.json`

## 6) Operational Logging and Audit

- Confirm generation logs are being written for test choices.
- Confirm admin action is traceable via normal admin audit logs.
- Confirm no unexpected 5xx in backend logs during create/update/publish flow.

## 7) Release Sign-off

Record this before go-live:

- Story slug:
- Admin operator:
- Validation result:
- Publish result:
- Frontend smoke result:
- AI fallback result:
- Import/export roundtrip result:
- Open risks:
- Approved for production: yes/no
