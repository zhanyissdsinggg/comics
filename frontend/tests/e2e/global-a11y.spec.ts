import { expect, test, type Route } from "@playwright/test";
import { createPosterPlaceholder } from "./support/placeholders";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { expectNoBasicA11yAuditIssues } from "./support/a11yAudit";
import { tabToAndExpectVisibleFocus } from "./support/keyboard";

const SEARCH_UI_TIMEOUT_MS = 15000;
const SEARCH_SERIES = {
  id: "series-dragon-ledger",
  title: "Dragon Ledger",
  author: "Northline Studio",
  type: "comic",
  status: "Ongoing",
  adult: false,
  description: "Mocked discovery result used for accessibility verification.",
  coverUrl: createPosterPlaceholder("Dragon Ledger"),
  badge: "Trending",
  badges: ["Trending"],
  genres: ["Fantasy", "Action"],
  episodeCount: 24,
  latestEpisodeId: "series-dragon-ledger-e24",
  freeEpisodeCount: 3,
  hasFreeEpisodes: true,
  rating: 4.8,
  ratingCount: 3420,
  followers: 1200,
  views: 5400,
  isPublished: true,
  updatedAt: "2026-03-26T08:00:00.000Z",
} as const;

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function handleSearchRoute(route: Route, signedIn: boolean): Promise<void> {
  const requestUrl = new URL(route.request().url());
  const pathname = requestUrl.pathname;

  if (pathname === "/api/health" || pathname === "/api/health/ready" || pathname === "/api/health/live") {
    await fulfillJson(route, { ok: true, dbOk: true });
    return;
  }

  if (pathname === "/api/meta/version") {
    await fulfillJson(route, { name: "gush-backend", version: "0.1.0", commit: "test-commit" });
    return;
  }

  if (pathname === "/api/regions/config") {
    await fulfillJson(route, { regions: [], defaultRegion: "US" });
    return;
  }

  if (pathname === "/api/branding") {
    await fulfillJson(route, { branding: {} });
    return;
  }

  if (pathname === "/api/auth/me") {
    await fulfillJson(
      route,
      signedIn
        ? {
            isSignedIn: true,
            user: {
              id: "user-001",
              email: "reader@example.com",
              emailVerified: true,
            },
          }
        : { isSignedIn: false, user: null },
    );
    return;
  }

  if (pathname === "/api/preferences") {
    await fulfillJson(route, {
      preferences: {
        notifyNewEpisode: true,
        notifyTtfReady: true,
        notifyPromo: false,
        region: "global",
        language: "en",
        hideAdultHistory: false,
      },
    });
    return;
  }

  if (pathname === "/api/search") {
    await fulfillJson(route, { results: [SEARCH_SERIES], total: 1 });
    return;
  }

  if (pathname === "/api/search/suggest") {
    await fulfillJson(route, { suggestions: [] });
    return;
  }

  if (pathname === "/api/search/keywords" || pathname === "/api/search/hot") {
    await fulfillJson(route, { keywords: [] });
    return;
  }

  if (pathname === "/api/search/log") {
    await fulfillJson(route, { ok: true });
    return;
  }

  if (pathname === "/api/series") {
    await fulfillJson(route, { series: [SEARCH_SERIES] });
    return;
  }

  if (pathname === "/api/recommendations/homepage") {
    await fulfillJson(route, { slots: [] });
    return;
  }

  if (pathname === "/api/notifications") {
    await fulfillJson(route, { notifications: [] });
    return;
  }

  if (pathname === "/api/wallet") {
    await fulfillJson(route, {
      wallet: {
        paidPts: 120,
        bonusPts: 10,
        plan: "free",
        subscription: null,
        subscriptionUsage: { remaining: 0 },
      },
    });
    return;
  }

  if (pathname === "/api/events/batch") {
    await fulfillJson(route, { ok: true });
    return;
  }

  await fulfillJson(route, {});
}

test.describe("Global accessibility guardrails", () => {
  test("desktop search should expose named header controls, dynamic cover alt text, and visible focus", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });
    await page.route("**/api/**", (route) => handleSearchRoute(route, true));
    await page.setViewportSize({ width: 1280, height: 900 });

    const response = await page.goto("/search?q=dragon", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const searchInput = page.getByPlaceholder("Search series, creators...");
    await expect(searchInput).toBeVisible({ timeout: SEARCH_UI_TIMEOUT_MS });
    await expect(page.getByRole("button", { name: "View your wallet" })).toBeVisible({
      timeout: SEARCH_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("button", { name: "View your notifications" })).toBeVisible({
      timeout: SEARCH_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("img", { name: "Comic cover image for Dragon Ledger" })).toBeVisible({
      timeout: SEARCH_UI_TIMEOUT_MS,
    });

    await tabToAndExpectVisibleFocus(page, searchInput, {
      label: "Desktop header search input",
      focusRingTarget: searchInput.locator("xpath=.."),
    });

    await page.waitForTimeout(300);
    await expectNoBasicA11yAuditIssues(page, "/search?q=dragon");
    await expectNoRuntimeIssues("/search?q=dragon", runtimeIssues);
  });

  test("mobile header should expose labeled search and menu controls", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });
    await page.route("**/api/**", (route) => handleSearchRoute(route, false));
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/search", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("link", { name: "Open search" })).toBeVisible({
      timeout: SEARCH_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("button", { name: "Open main menu" })).toBeVisible({
      timeout: SEARCH_UI_TIMEOUT_MS,
    });
    await tabToAndExpectVisibleFocus(page, page.getByRole("link", { name: "Open search" }), {
      label: "Mobile Open search control",
    });
    await tabToAndExpectVisibleFocus(page, page.getByRole("button", { name: "Open main menu" }), {
      label: "Mobile main menu button",
      resetBeforeTab: false,
    });

    await page.waitForTimeout(300);
    await expectNoBasicA11yAuditIssues(page, "/search");
    await expectNoRuntimeIssues("/search", runtimeIssues);
  });
});
