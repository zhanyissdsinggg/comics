# Tappytoon Next.js

## Progress
- Added `app/series/[id]/page.jsx` to fetch and render series detail data.
- Added `app/series/[id]/loading.jsx` for a basic loading skeleton.
- Added `app/api/series/[id]/route.js` mock API and wired `page.jsx` to the new response shape.
- Split series UI into `components/series/*`, added shared UI in `components/common/*`, and added `hooks/useCountdown.js`, `lib/apiClient.js`, `lib/adultGate.js`.
- Added series page layout structure with header/CTA, episode toolbar, and wallet aside.
- Added adult gating helpers and blocking panel/modals for adult series flow.
- Added CTA behaviors (read/subscribe/start/continue) and placeholder modals for unlock/claim actions.
- Added analytics stub and series/episode CTA tracking hooks.
- Reworked series page to client-side data fetching, adult gating flow, and mock DB-driven API responses.
- Updated series page components to follow new API/gate flow and CTA handlers.
- Mock API now derives episodes from prototype series items and latest episode strings.
- Added App Router pages for `/`, `/adult`, and `/library` with global layout metadata.
- Introduced shared auth/wallet/adult gate/home tab stores and a global SiteHeader.
- Split home/adult/library UI into maintainable components with rails, hero, and skeletons.
- Added rewards/mission check-in system and reader paywall flow with API-backed stores.
- Adjusted episode CTA labels to match unlock/claim/subscribe expectations.
- Added Suspense wrappers for search-param pages to avoid prerender errors.
- Added reader image quality downgrade, resume flow, and prefetch retry.
- Added API cache stats/debug panel and cache invalidation on writes.
- Fixed auth session mock to persist via user cookies for /api/auth/me and protected APIs.
- Added subscription plans + subscribe API, coupon system, and pricing helpers for unlock/pack.
- Added `/subscribe` page, coupon redeem UI, and subscription-aware pricing in reader/series.
- Added admin analytics dashboard + daily stats API (views/registrations/DAU).
- Added tracking settings (admin-only) with localStorage + runtime injection slots.
- Added server-side persistence for tracking config (admin + runtime fetch).
- Added bookmarks/history server sync + search suggest/hot endpoints.
- Added Prisma module, password hashing, and DB-backed auth/session.
- Migrated wallet, payments, orders, entitlements, progress, follow to Prisma-backed storage.
- Added session middleware to resolve userId from DB-backed sessions.
- Migrated ratings to Prisma-backed storage with series aggregate updates.
- Migrated comments, reading (bookmarks/history), search logs, rewards/missions, notifications, admin users/orders to Prisma-backed storage.
- Migrated series/episodes/admin series management to Prisma-backed storage.
# Backend
- Start backend: `cd backend; npm run start:dev`
- Health check: `http://localhost:4000/api/health`
- Prisma (optional): `npm run prisma:generate`
- Self-check (user flow): `npm run self-check`
- Self-check (admin): `npm run self-check-admin`
- Compensation sweep: `npm run compensate`
- Seed data: `npm run seed`
- DB init (generate/push/seed): `npm run db:init`
- DB backup: `npm run db:backup`
- DB restore: `npm run db:restore <backup.json>`
- Redis (optional): set `REDIS_URL` to enable rate-limit/idempotency cache

# Docker (local deploy)
- Build + run: `docker compose up --build`
- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/api/health`

# Frontend
- Start frontend: `npm run dev`
- API base URL: set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
# Dev shortcut (Windows)
- Run both: `powershell -ExecutionPolicy Bypass -File scripts/dev-all.ps1`

# Env templates
- Frontend: `.env.example`
- Backend: `backend/.env.example`
# Observability
- Global error toast shows when API returns 5xx or network error.
# Backend meta
- Version endpoint: `/api/meta/version`
- UI badge appears bottom-right when backend is reachable.
# Auth UX
- Global 401 will trigger Sign in modal automatically.
# Auth middleware
- Backend enforces unified auth middleware for protected API prefixes.
# Errors
- API client now maps error codes to friendly UI messages automatically.
# API client reliability
- Timeout per request (default 8s)
- LocalStorage fallback cache for GET (stale reads when offline)
# Auth trigger
- Custom event `auth:open` will open login modal globally.
# Stale UI
- Pages show a yellow notice when cached data is used.
# Retry
- Home/Library/Search will auto retry once on network/5xx errors.
# Diagnostics
- Visit `/diagnostics` to check backend status.
# Diagnostics
- Header includes Diagnostics link.
# Offline
- App shows offline banner when connection drops.
# Analytics
- API errors now emit `api_error` with status/errorCode/requestId.
# UX upgrades (2026-02-03)
- Added new-reader guidance block and "Start Here" rail on Home.
- Added reader progress bar, paywall preview notice, and unlock education copy.
- Added unlock tips in shortfall modal.
- Added episode progress indicator in series list.
- Added subscription perk comparison table + savings hint.
- Added hot search time window toggles (Today/Week/Month).
- Added progress bars on Continue cards in rails.
- Added subscription value badge + example savings hint.
- Added reader drawer subscribe CTA.
- Added search empty-state quick hot keywords.
- Added reader keyboard shortcuts (N/T/B, arrows) with on-screen hint.
- Added series header preview hint + subscriber value blurb.
- Added episode list filters (All/Locked/Unlocked/TTF).
- Added series header last-read progress summary.
- Added reader auto-scroll toggle (A key) with UI control.
- Added Library navigation links and recommendation rail cleanup.
- Added comments sorting (Latest/Top) with sign-in CTA.
# Performance
- Reader image metrics are shown bottom-left (avg load time / error count).
# Performance
- Perf badge only shows in development (NODE_ENV !== production).
# Diagnostics
- Visit `/events` for recent client event log.
# Diagnostics
- `/events` supports filtering by event name.
# Diagnostics
- `/events` now supports error-only filter, clear, and export.
# Diagnostics
- Client events are posted to backend `/api/events` (requires signed-in user).
# Diagnostics
- `/events` supports local/server source toggle.
# Diagnostics
- `/api/events?event=xxx` supports server-side filtering.
# Diagnostics
- `/events` supports clearing server events (DELETE /api/events).
# Diagnostics
- `/api/events` supports limit/offset pagination.
# Diagnostics
- `/events` shows aggregated counts when in server mode.
# Diagnostics
- `/events` shows recent error summary.
# Diagnostics
- `/events` supports time window filter (5m/1h/24h).
# Diagnostics
- `/events` uses expandable rows to view event payloads.
# Diagnostics
- `/api/events/export` returns JSON attachment for server events.

## Self-check (2026-01-30)
- Frontend dev server responds on http://localhost:3000 (HTTP 200).
- Backend health check responds on http://localhost:4000/api/health (ok=true).
- `/adult` and `/library` redirect to gate when cookies missing (HTTP 307 expected).
- `/series/c1` returns HTTP 200.
## Self-check (2026-01-30, deep)
- Fixed backend auth register crash caused by crypto.randomUUID import.
- Auth register/login flow verified; `/api/auth/me` returns 200.
- Wallet GET/topup works and returns updated balances.
- Entitlement GET/unlock (WALLET) works and returns updated wallet+entitlement.
- Episode content API returns 200 for `/api/episode`.
- TTF claim returns 409 when not ready (expected).
- Follow/Notifications/Rewards/Missions/Search endpoints return 200+.
- Comments create works with `{ text }` payload (201).
- Admin panel redesigned with left sidebar navigation and light admin shell.
