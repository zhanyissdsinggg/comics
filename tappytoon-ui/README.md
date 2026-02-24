# Tappytoon-style UI (Next.js + Tailwind)

This is a runnable **Next.js (App Router)** project scaffolded for your current UI.

## Quick start

```bash
npm install
npm run dev
```

Open: http://localhost:3000

## Where your page code lives

- `app/page.jsx` imports and renders `components/TappytoonStyleLandingPage.jsx`.

> Note: In this export, the landing page file contains a **placeholder** because I can't directly read the full Canvas content from this chat export.
> Replace the placeholder with your latest Canvas code (the big React component), or paste your component into `components/TappytoonStyleLandingPage.jsx`.

## Tailwind

- `app/globals.css` contains Tailwind directives.
- `tailwind.config.js` scans `app/` and `components/`.

## Next steps (recommended)

- Split the monolithic component into:
  - `components/Header.jsx`
  - `components/HeroCarousel.jsx`
  - `components/Rail.jsx`
  - `components/modals/*`
- Convert the `route` state into real routes:
  - `/` -> home
  - `/adult` -> adult hub
  - `/library` -> library
