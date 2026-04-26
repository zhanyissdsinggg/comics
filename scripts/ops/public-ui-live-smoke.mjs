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
        const seriesId = readEnv("OPS_SMOKE_SERIES_ID", DEFAULT_DEMO_SERIES_ID);
        await page.goto(`${baseUrl}/series/${encodeURIComponent(seriesId)}`, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        await page.waitForLoadState("networkidle", { timeout: 60_000 });

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
        await page.locator(`a[href^="/series/${seriesId}"]`).first().click({ timeout: DEFAULT_TIMEOUT_MS });
        await page.waitForURL((url) => url.pathname === `/series/${seriesId}`, { timeout: 60_000 });
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
    const tab = nav.getByText(spec.label, { exact: true });
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
