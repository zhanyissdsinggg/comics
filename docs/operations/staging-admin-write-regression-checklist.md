# Staging Admin Write Regression Checklist

Use this checklist in staging before promoting a release to production.

Scope:

- admin write operations only
- no production execution
- validate both API behavior and UI/admin panel behavior when available

Preconditions:

- staging frontend and backend are deployed
- staging uses isolated database, Redis, email, webhook, and storage config
- at least one staging admin key works
- run `npm run ops:deploy-gate` against staging first
- run `npm run ops:admin-routes` and keep [admin-route-inventory.md](./admin-route-inventory.md) open while testing

## 1) Auth and Session

- Login from `/admin/login`
  Expected: login succeeds, admin routes unlock, no duplicate modal/session errors.
- Logout from the admin UI
  Expected: redirected to login, protected GET endpoints return `401/403`, refresh token cannot mint a new access token.
- Login again after logout
  Expected: a new session is created cleanly.

## 2) Series Management

API surface:

- `POST /api/admin/series`
- `PATCH /api/admin/series/:id`
- `DELETE /api/admin/series/:id`

Checklist:

- Create one disposable staging series
- Edit title, badge, visibility, or status
- Delete the disposable series

Expected:

- create returns the new id
- edited values appear in list and detail views
- delete removes the record from admin list
- no orphaned episode rows or broken detail pages remain

Cleanup:

- ensure the disposable series is deleted before the session ends

## 3) Episode Management

API surface:

- `POST /api/admin/series/:id/episodes`
- `POST /api/admin/series/:id/episodes/bulk`
- `POST /api/admin/series/:id/episodes/upload`
- `PATCH /api/admin/series/:id/episodes/:episodeId`
- `DELETE /api/admin/series/:id/episodes/:episodeId`

Checklist:

- Create one disposable episode on a disposable staging series
- Update price, title, publish flags, or ordering
- If upload flow is configured, upload a tiny safe image payload
- Delete the disposable episode

Expected:

- ordering is stable in admin and reader-facing lists
- price/lock state changes are reflected in the reader payload
- upload does not break episode rendering
- delete removes the episode and its admin row

Cleanup:

- remove disposable uploads if your storage bucket is persistent

## 4) Promotions and Recommendations

API surface:

- `PATCH /api/admin/promotions/defaults`
- `POST/PATCH/DELETE /api/admin/promotions/:id?`
- `POST/PATCH/DELETE /api/admin/recommendations/slots/:id?`
- `POST/PATCH/DELETE /api/admin/recommendations/rankings/:id?`
- `POST /api/admin/recommendations/analytics`

Checklist:

- Create one disposable promotion
- Update defaults and confirm the UI reads back the new values
- Create one disposable recommendation slot or ranking
- Delete all disposable items

Expected:

- list endpoints immediately reflect writes
- frontend promotional surfaces do not crash when the new config is present
- deleting disposable config restores the prior state

Cleanup:

- restore baseline promotion defaults if they were changed for the test

## 5) Billing and Orders

API surface:

- `POST/PATCH /api/admin/billing/topups`
- `POST/PATCH /api/admin/billing/plans`
- `POST /api/admin/orders/refund`
- `POST /api/admin/orders/refund/:id`
- `POST /api/admin/orders/adjust`
- `DELETE /api/admin/orders/:id`

Checklist:

- Create or update one disposable top-up package
- Create or update one disposable plan
- If staging has seeded test orders only, run one refund path and one adjust path on test data only
- Verify idempotency behavior for adjustment requests if supported by the UI

Expected:

- package/plan changes appear in store and billing admin pages
- refund/adjust operations return deterministic statuses
- repeated adjustment with the same idempotency key does not double-apply
- wallet and order views stay consistent after mutation

Cleanup:

- revert disposable package/plan changes
- never use live-like payment data outside staging

## 6) Users and Support

API surface:

- `PATCH /api/admin/users/block`
- `PATCH /api/admin/users/:id/block`
- `DELETE /api/admin/users/:id`
- `POST /api/admin/support/:id/reply`
- `PATCH /api/admin/support/:id/close`
- `DELETE /api/admin/support/:id`

Checklist:

- Block and unblock one disposable staging user
- Soft-delete one disposable user if the environment contains seeded users only
- Reply to one disposable support ticket
- Close the same ticket

Expected:

- user block state is reflected in admin list and user-facing auth behavior where applicable
- support replies are stored and visible in the ticket thread
- close/delete actions update ticket status immediately

Cleanup:

- avoid mutating real QA accounts shared by the team

## 7) Notifications, Email, and Regions

API surface:

- `POST /api/admin/notifications`
- `DELETE /api/admin/notifications/:id`
- `POST /api/admin/email`
- `POST /api/admin/email/test`
- `POST /api/admin/email/jobs/retry`
- `POST /api/admin/regions`

Checklist:

- Create one disposable notification
- Send only staging-safe test email payloads
- Retry one failed staging email job if such a seed exists
- Add or update one disposable region/config item

Expected:

- notification appears in admin list and target staging user inbox if applicable
- email endpoints do not hit production recipients
- region changes are readable from frontend config endpoints

Cleanup:

- delete disposable notification/config records after validation

## 8) Branding, Uploads, and Content Pipeline

API surface:

- `POST /api/admin/branding`
- `POST /api/admin/upload/image`
- `POST /api/admin/generate-content`
- `POST /api/admin/tracking`

Checklist:

- Upload one disposable branding or content image
- Save one disposable tracking config change
- If content generation is enabled, run one safe generation request against disposable staging content only

Expected:

- uploaded asset is reachable and does not break frontend rendering
- tracking config round-trips cleanly via GET
- generation jobs return structured success/failure and do not stall indefinitely

Cleanup:

- remove disposable assets and reset tracking config to baseline if needed

## 9) Marketing Campaigns

API surface:

- `POST/PATCH/DELETE /api/admin/marketing/campaigns/:id?`
- `POST /api/admin/marketing/campaigns/:id/analytics`
- `POST /api/admin/marketing/campaigns/:id/targets`
- `PATCH /api/admin/marketing/campaigns/:campaignId/targets/:userId`
- `PATCH /api/admin/marketing/campaigns/:id/budget`

Checklist:

- Create one disposable campaign
- Add one target or analytics entry
- Update budget
- Delete the campaign

Expected:

- campaign analytics and targets remain readable after each write
- deleting a campaign removes it from list views without crashing related pages

Cleanup:

- delete all disposable campaigns and targets

## 10) Comments and Moderation

API surface:

- `PATCH /api/admin/comments/hide`
- `PATCH /api/admin/comments/recalc-rating`
- `DELETE /api/admin/comments/:id`

Checklist:

- Hide one disposable staging comment
- Trigger rating recalculation on seeded staging content only
- Delete one disposable moderation target if safe

Expected:

- moderation state is visible in admin and public comment views
- recalculated rating is internally consistent with visible comments

## Sign-off Template

Record this after each staging release rehearsal:

- Commit tested:
- Staging frontend URL:
- Staging backend URL:
- Admin key source:
- Read-only gate result:
- Write-flow checklist result:
- Open defects:
- Safe to promote to production: yes/no

