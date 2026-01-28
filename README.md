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
