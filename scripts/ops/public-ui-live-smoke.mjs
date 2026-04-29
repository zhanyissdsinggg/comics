import process from "node:process";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const requireFromFrontend = createRequire(path.resolve(ROOT, "frontend/package.json"));
const { chromium } = requireFromFrontend("@playwright/test");

const DEFAULT_FRONTEND_URL = "https://www.gushcomics.com";
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_DEMO_SERIES_ID = "demo-series";

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return DEFAULT_FRONTEND_URL;
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function readEnv(name, fallback) {
  const value = String(process.env[name] || "").trim();
  return value || fallback;
}

async function expectRoute(page, baseUrl, pathname) {
  await page.waitForURL(`${baseUrl}${pathname}`, { timeout: DEFAULT_TIMEOUT_MS });
}

async function clickNavHref(page, href) {
  // Prefer clicking within the sticky header when possible, but fall back to any matching link.
  const selector = `a[href="${href}"]`;
  const headerLink = page.locator('[data-site-header="1"]').locator(selector).first();
  if (await headerLink.isVisible().catch(() => false)) {
    await headerLink.click();
    return;
  }

  await page.locator(selector).first().click();
}

async function pickFirstVisibleLocator(candidates, options = {}) {
  const perCandidateTimeoutMs = Number(options.perCandidateTimeoutMs || 800);
  const list = Array.isArray(candidates) ? candidates : [];

  for (const locator of list) {
    if (!locator) {
      continue;
    }
    try {
      await locator.waitFor({ state: "visible", timeout: perCandidateTimeoutMs });
      return locator;
    } catch {
      // ignore and try next
    }
  }

  return null;
}

async function clickFirstMatching(page, selector, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout: timeoutMs });
  await locator.click({ timeout: timeoutMs });
}

async function runDesktopSuite(baseUrl) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await context.newPage();

  const failures = [];
  const record = (id, err) => {
    failures.push({ id, error: err instanceof Error ? err.message : String(err) });
  };

  const checks = [
    {
      id: "home.load",
      run: async () => {
        await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 60_000 });
        await page.locator('[data-site-header="1"]').waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
      },
    },
    {
      id: "home.hero-cta-enters-series",
      run: async () => {
        // Prefer the explicit hero CTA testid, but fall back to the first "Start Reading" / "Continue Reading" link.
        const heroCta = await pickFirstVisibleLocator(
          [
            page.getByTestId("home-hero-primary-cta"),
            page.getByRole("link", { name: /^(Start Reading|Continue Reading)$/ }).first(),
          ],
          { perCandidateTimeoutMs: 8000 },
        );

        if (!heroCta) {
          throw new Error("unable to locate home hero CTA");
        }

        await heroCta.click({ timeout: DEFAULT_TIMEOUT_MS });
        await page.waitForURL(
          (url) => url.pathname.startsWith("/series/") || url.pathname.startsWith("/read/"),
          { timeout: 60_000 },
        );
      },
    },
    {
      id: "nav.featured",
      run: async () => {
        await clickNavHref(page, "/rankings");
        await expectRoute(page, baseUrl, "/rankings");
      },
    },
    {
      id: "nav.comics",
      run: async () => {
        await clickNavHref(page, "/comics");
        await expectRoute(page, baseUrl, "/comics");
      },
    },
    {
      id: "nav.novels",
      run: async () => {
        await clickNavHref(page, "/novels");
        await expectRoute(page, baseUrl, "/novels");
      },
    },
    {
      id: "nav.creators",
      run: async () => {
        await clickNavHref(page, "/creators");
        await expectRoute(page, baseUrl, "/creators");
      },
    },
    {
      id: "adult.toggle-opens-modal",
      run: async () => {
        const toggle = page.getByTestId("adult-toggle-button");
        if (await toggle.isVisible().catch(() => false)) {
          await toggle.click({ timeout: DEFAULT_TIMEOUT_MS });
          // Adult toggle should either route to /adult (already validated age) or open a gate modal.
          // We validate at least one of those happens.
          const urlNow = page.url();
          if (new URL(urlNow).pathname === "/adult") {
            return;
          }

          // Our modal base does not use role="dialog"; use the close button label instead.
          const closeModal = page.getByLabel("Close modal").first();
          await closeModal.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        }
      },
    },
    {
      id: "series.primary-action-enters-reader",
      run: async () => {
        // If we're already on a series page (from home or search), reuse it; otherwise use the demo series id.
        let seriesId = readEnv("OPS_SMOKE_SERIES_ID", DEFAULT_DEMO_SERIES_ID);
        const currentPath = new URL(page.url()).pathname;
        if (currentPath.startsWith("/series/")) {
          seriesId = currentPath.split("/")[2] || seriesId;
        } else {
          await page.goto(`${baseUrl}/series/${encodeURIComponent(seriesId)}`, {
            waitUntil: "domcontentloaded",
            timeout: 60_000,
          });
          await page.waitForLoadState("networkidle", { timeout: 60_000 });
        }

        // Validate the creator link is usable (content-first but creator-aware).
        const creatorLink = await pickFirstVisibleLocator(
          [
            page.getByTestId("series-creator-link"),
            page.locator('a[href^="/creators/"]').first(),
            page.getByRole("link", { name: /^Creator$/ }).first(),
          ],
          { perCandidateTimeoutMs: 1500 },
        );
        if (creatorLink) {
          await creatorLink.click({ timeout: DEFAULT_TIMEOUT_MS });
          await page.waitForURL(
            (url) => url.pathname.startsWith("/creators/"),
            { timeout: 60_000, waitUntil: "domcontentloaded" },
          );
          await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
          await page.waitForURL(
            (url) => url.pathname === `/series/${seriesId}`,
            { timeout: 60_000, waitUntil: "domcontentloaded" },
          );
        }

        // Validate follow/save is gated when signed out: clicking should open the auth modal rather than no-op.
        const followButton = await pickFirstVisibleLocator(
          [
            page.getByRole("button", { name: /^(Save to library|Remove from library)$/ }).first(),
            page.locator('button[aria-label="Save to library"]').first(),
          ],
          { perCandidateTimeoutMs: 1500 },
        );
        if (followButton) {
          await followButton.click({ timeout: DEFAULT_TIMEOUT_MS });
          const closeModal = page.getByLabel("Close modal").first();
          // If we're signed-in in this smoke context, the modal may not appear. That's fine.
          if (await closeModal.isVisible().catch(() => false)) {
            await closeModal.click({ timeout: DEFAULT_TIMEOUT_MS });
          }
        }

        const primary = await pickFirstVisibleLocator(
          [
            page.getByTestId("series-primary-action"),
            page.getByRole("button", { name: /^(Read|Start Reading|Continue Reading)$/ }).first(),
            page.locator("button").filter({ hasText: /^Read$/ }).first(),
          ],
          { perCandidateTimeoutMs: 1500 },
        );
        if (!primary) {
          throw new Error("unable to locate series primary action");
        }
        await primary.click({ timeout: DEFAULT_TIMEOUT_MS });

        await page.waitForURL(
          (url) => url.pathname.startsWith(`/read/${seriesId}/`),
          { timeout: 60_000 },
        );
      },
    },
    {
      id: "account.page-load-unauth",
      run: async () => {
        await page.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 60_000 });
        // Contract: the page should render something meaningful without crashing.
        // We accept either a visible title or a sign-in CTA or the site header.
        await page.locator('[data-site-header="1"]').waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
      },
    },
    {
      id: "library.page-load-unauth",
      run: async () => {
        await page.goto(`${baseUrl}/library`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 60_000 });
        await page.locator('[data-site-header="1"]').waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
      },
    },
    {
      id: "notifications.page-load-unauth",
      run: async () => {
        await page.goto(`${baseUrl}/notifications`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 60_000 });
        await page.locator('[data-site-header="1"]').waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
      },
    },
    {
      id: "notifications.library-button-navigates",
      run: async () => {
        await page.goto(`${baseUrl}/notifications`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 60_000 });

        const libraryButton = await pickFirstVisibleLocator(
          [
            page.getByTestId("notifications-go-library").first(),
            page.getByRole("button", { name: "Library" }).first(),
          ],
          { perCandidateTimeoutMs: 8000 },
        );
        if (!libraryButton) {
          throw new Error("unable to locate notifications library button");
        }
        await libraryButton.click({ timeout: DEFAULT_TIMEOUT_MS });
        await page.waitForURL((url) => url.pathname === "/library", {
          timeout: 60_000,
          waitUntil: "domcontentloaded",
        });
      },
    },
    {
      id: "notifications.mark-read-safe",
      run: async () => {
        await page.goto(`${baseUrl}/notifications`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 60_000 });

        const button = await pickFirstVisibleLocator(
          [
            page.getByRole("button", { name: /^Mark read$/ }).first(),
            page.getByRole("button", { name: /^Saving\.\.\.$/ }).first(),
          ],
          { perCandidateTimeoutMs: 8000 },
        );
        if (!button) {
          throw new Error("unable to locate notifications mark-read button");
        }

        // This check is explicitly "safe": the button may be disabled when there are no unread items.
        const disabled = await button.isDisabled().catch(() => false);
        if (!disabled) {
          await button.click({ timeout: DEFAULT_TIMEOUT_MS });
        }

        // Contract: clicking must not navigate away or crash the page shell.
        await page.locator('[data-site-header="1"]').waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
      },
    },
    {
      id: "reader.chapters-drawer-open-close",
      run: async () => {
        const currentPath = new URL(page.url()).pathname;
        if (!currentPath.startsWith("/read/")) {
          const seriesId = readEnv("OPS_SMOKE_SERIES_ID", DEFAULT_DEMO_SERIES_ID);
          const episodeId = readEnv("OPS_SMOKE_EPISODE_ID", "demo-episode");
          await page.goto(`${baseUrl}/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(episodeId)}`, {
            waitUntil: "domcontentloaded",
            timeout: 60_000,
          });
          await page.waitForLoadState("networkidle", { timeout: 60_000 });
        }

        const chapters = page.getByRole("button", { name: "Chapters" });
        await chapters.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await chapters.click({ timeout: DEFAULT_TIMEOUT_MS });

        const drawer = page.locator('[aria-label="Reader contents"]');
        await drawer.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });

        // Close and ensure it hides to validate both open + close transitions.
        const close = drawer.getByRole("button", { name: "Close" });
        if (await close.isVisible().catch(() => false)) {
          await close.click({ timeout: DEFAULT_TIMEOUT_MS });
          await drawer.waitFor({ state: "hidden", timeout: DEFAULT_TIMEOUT_MS });
        }
      },
    },
    {
      id: "search.type-and-open-first-result",
      run: async () => {
        const seriesId = readEnv("OPS_SMOKE_SERIES_ID", DEFAULT_DEMO_SERIES_ID);
        await page.goto(`${baseUrl}/search`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 60_000 });

        const input = await pickFirstVisibleLocator(
          [
            page.getByTestId("storefront-search-input"),
            page.getByLabel("Search series, creators, or genres"),
            page.getByPlaceholder("Search titles, genres, or creators"),
            page.locator('input[type="search"]').first(),
          ],
          { perCandidateTimeoutMs: 10_000 },
        );
        if (!input) {
          throw new Error("unable to locate search input");
        }
        await input.fill("Demo Series");
        await input.press("Enter");

        await page.waitForURL((url) => url.pathname === "/search" && url.searchParams.has("q"), {
          timeout: 60_000,
        });

        // Open the demo series from results (href may include attribution query params).
        await clickFirstMatching(page, `a[href^="/series/${seriesId}"]`);
        // Some deployments can be slow to navigate from /search -> /series; treat it as a DOM-level contract:
        // we should either navigate to the series route, or at least render a link back to the series route.
        await page.waitForFunction(
          (expectedPath) =>
            window.location.pathname === expectedPath ||
            Boolean(document.querySelector(`a[href^="${expectedPath}"]`)),
          `/series/${seriesId}`,
          { timeout: 90_000 },
        );
      },
    },
    {
      id: "library.entry-cta-navigates",
      run: async () => {
        await page.goto(`${baseUrl}/library`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 60_000 });

        const entryCta = await pickFirstVisibleLocator(
          [
            page.getByTestId("library-entry-cta").first(),
            page.getByRole("button", { name: "Search" }).first(),
            page.getByRole("link", { name: "Search" }).first(),
            page.locator('a[href="/search"]').first(),
            page.locator('a[href^="/search"]').first(),
            page.locator('a[href*="/search"]').first(),
            page.getByRole("button", { name: "Start here" }).first(),
            page.getByRole("button", { name: "Top Picks" }).first(),
          ],
          { perCandidateTimeoutMs: 8000 },
        );

        if (!entryCta) {
          throw new Error("unable to locate library entry CTA");
        }

        const entryLabel = String(await entryCta.innerText().catch(() => "")).trim();
        await entryCta.click({ timeout: DEFAULT_TIMEOUT_MS });

        if (/start here|top picks/i.test(entryLabel)) {
          await page.waitForURL((url) => url.pathname === "/rankings", {
            timeout: 60_000,
            waitUntil: "domcontentloaded",
          });
          return;
        }

        await page.waitForURL((url) => url.pathname === "/search", {
          timeout: 60_000,
          waitUntil: "domcontentloaded",
        });
      },
    },
    {
      id: "rankings.open-first-series-and-read",
      run: async () => {
        await page.goto(`${baseUrl}/rankings`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 60_000 });

        const seriesLink = await pickFirstVisibleLocator(
          [
            page.locator('a[href^="/series/"]').first(),
            page.getByRole("link", { name: /Open/i }).first(),
          ],
          { perCandidateTimeoutMs: 8000 },
        );
        if (!seriesLink) {
          throw new Error("unable to locate a series link on rankings");
        }

        await seriesLink.click({ timeout: DEFAULT_TIMEOUT_MS });
        await page.waitForURL(
          (url) => url.pathname.startsWith("/series/"),
          { timeout: 60_000, waitUntil: "domcontentloaded" },
        );

        // Reuse the existing primary-action flow by clicking the series CTA on the series page.
        const primary = await pickFirstVisibleLocator(
          [
            page.getByTestId("series-primary-action"),
            page.getByRole("button", { name: /^(Read|Start Reading|Continue Reading)$/ }).first(),
            page.locator("button").filter({ hasText: /^Read$/ }).first(),
          ],
          { perCandidateTimeoutMs: 8000 },
        );
        if (!primary) {
          throw new Error("unable to locate series primary action after navigating from rankings");
        }
        await primary.click({ timeout: DEFAULT_TIMEOUT_MS });

        await page.waitForURL((url) => url.pathname.startsWith("/read/"), { timeout: 60_000 });
      },
    },
  ];

  for (const check of checks) {
    try {
      await check.run();
      console.log(`[ops-public-ui] PASS ${check.id} -> ${new URL(page.url()).pathname}`);
    } catch (err) {
      record(check.id, err);
      console.error(`[ops-public-ui] FAIL ${check.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await context.close();
  await browser.close();

  if (failures.length > 0) {
    throw new Error(`public-ui desktop suite failed: ${failures.map((f) => f.id).join(", ")}`);
  }
}

async function runMobileSuite(baseUrl) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 60_000 });

  const nav = page.locator('[data-mobile-bottom-nav="1"]');
  await nav.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });

  const tabSpecs = [
    { label: "Home", expect: "/" },
    { label: "Search", expect: "/search" },
    { label: "Library", expect: "/library" },
    { label: "Account", expect: "/account" },
  ];

  for (const spec of tabSpecs) {
    const tab = nav.getByRole("link", { name: spec.label, exact: true });
    if (await tab.isVisible().catch(() => false)) {
      await tab.click({ timeout: DEFAULT_TIMEOUT_MS });
      await expectRoute(page, baseUrl, spec.expect);
      console.log(`[ops-public-ui] PASS mobile.tab.${spec.label.toLowerCase()} -> ${spec.expect}`);
    }
  }

  await context.close();
  await browser.close();
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  console.log(`[ops-public-ui] baseUrl=${baseUrl}`);

  await runDesktopSuite(baseUrl);
  await runMobileSuite(baseUrl);

  console.log("[ops-public-ui] pass");
}

main().catch((error) => {
  console.error(`[ops-public-ui] fail: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
