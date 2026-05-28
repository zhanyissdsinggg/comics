import { expect, test, type Route } from "@playwright/test";
import {
  createBannerPlaceholder,
  createPosterPlaceholder,
} from "./support/placeholders";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { expectNoBasicA11yAuditIssues } from "./support/a11yAudit";
import { tabToAndExpectVisibleFocus } from "./support/keyboard";

const HOME_UI_TIMEOUT_MS = 15000;
const HOME_SERIES = [
  {
    id: "series-slot-hero",
    title: "Velvet Voltage",
    author: "Paper Harbor",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "Manual hero pick that should lead the homepage carousel.",
    coverUrl: createPosterPlaceholder("Velvet Voltage"),
    bannerUrl: createBannerPlaceholder("Velvet Voltage"),
    badge: "",
    badges: [],
    genres: ["Romance", "Drama"],
    episodeCount: 18,
    latestEpisodeId: "episode-18",
    freeEpisodeCount: 3,
    hasFreeEpisodes: true,
    rating: 4.1,
    ratingCount: 210,
    followers: 2800,
    views: 9200,
    isPublished: true,
    updatedAt: "2026-03-14T08:00:00.000Z",
  },
  {
    id: "series-slot-free",
    title: "Soft Launch Kiss",
    author: "Blue Meadow",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "Manual free-start pick for first-time readers.",
    coverUrl: createPosterPlaceholder("Soft Launch Kiss"),
    badge: "",
    badges: [],
    genres: ["Romance", "Comedy"],
    episodeCount: 12,
    latestEpisodeId: "episode-12",
    freeEpisodeCount: 1,
    hasFreeEpisodes: true,
    rating: 4.0,
    ratingCount: 160,
    followers: 1900,
    views: 6100,
    isPublished: true,
    updatedAt: "2026-03-13T08:00:00.000Z",
  },
  {
    id: "series-slot-binge",
    title: "Last Ember Files",
    author: "Nocturne Works",
    type: "comic",
    status: "Completed",
    adult: false,
    description:
      "Manual binge-ready pick that should replace the default chart leader.",
    coverUrl: createPosterPlaceholder("Last Ember Files"),
    badge: "",
    badges: [],
    genres: ["Thriller", "Mystery"],
    episodeCount: 30,
    latestEpisodeId: "episode-30",
    freeEpisodeCount: 0,
    hasFreeEpisodes: false,
    rating: 4.0,
    ratingCount: 140,
    followers: 1600,
    views: 5400,
    isPublished: true,
    updatedAt: "2026-03-12T08:00:00.000Z",
  },
  {
    id: "series-slot-breakout",
    title: "Rocket Choir",
    author: "Signal House",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "Manual breakout pick tied to live search momentum.",
    coverUrl: createPosterPlaceholder("Rocket Choir"),
    badge: "NEW",
    badges: ["NEW"],
    genres: ["Fantasy", "Action"],
    episodeCount: 9,
    latestEpisodeId: "episode-9",
    freeEpisodeCount: 0,
    hasFreeEpisodes: false,
    rating: 4.1,
    ratingCount: 120,
    followers: 1500,
    views: 5000,
    isPublished: true,
    updatedAt: "2026-03-11T08:00:00.000Z",
  },
] as const;

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.describe("Home accessibility", () => {
  test("home should expose typed cover alt text across hero and shelves", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;

      if (
        pathname === "/api/health" ||
        pathname === "/api/health/ready" ||
        pathname === "/api/health/live"
      ) {
        await fulfillJson(route, { ok: true, dbOk: true });
        return;
      }

      if (pathname === "/api/meta/version") {
        await fulfillJson(route, {
          name: "gush-backend",
          version: "0.1.0",
          commit: "test-commit",
        });
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
        await fulfillJson(route, { isSignedIn: false, user: null });
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

      if (pathname === "/api/series") {
        await fulfillJson(route, { series: HOME_SERIES });
        return;
      }

      if (pathname === "/api/search/hot") {
        await fulfillJson(route, {
          keywords: [
            {
              keyword: "rocket choir",
              count: 920,
              growthLabel: "Featured pick",
            },
          ],
        });
        return;
      }

      if (pathname === "/api/recommendations/homepage") {
        await fulfillJson(route, {
          slots: [
            {
              id: "slot-home-hero",
              slot: "home-hero",
              seriesIds: ["series-slot-hero", "series-slot-breakout"],
            },
            {
              id: "slot-home-free-start",
              slot: "home-free-start",
              seriesIds: ["series-slot-free"],
            },
            {
              id: "slot-home-binge-ready",
              slot: "home-binge-ready",
              seriesIds: ["series-slot-binge"],
            },
            {
              id: "slot-home-breakout",
              slot: "home-breakout",
              seriesIds: ["series-slot-breakout"],
            },
          ],
        });
        return;
      }

      if (pathname === "/api/events/batch") {
        await fulfillJson(route, { ok: true });
        return;
      }

      await fulfillJson(route, {});
    });

    const runtimeIssues = collectRuntimeIssues(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByText("Open a story you'll keep thinking about.").first(),
    ).toBeVisible({
      timeout: HOME_UI_TIMEOUT_MS,
    });
    await expect(
      page
        .getByRole("img", { name: "Comic cover image for Velvet Voltage" })
        .first(),
    ).toBeVisible({
      timeout: HOME_UI_TIMEOUT_MS,
    });
    await expect(
      page
        .getByRole("img", { name: "Comic cover image for Soft Launch Kiss" })
        .first(),
    ).toBeVisible({
      timeout: HOME_UI_TIMEOUT_MS,
    });
    await expect(
      page
        .getByRole("img", { name: "Comic cover image for Last Ember Files" })
        .first(),
    ).toBeVisible({
      timeout: HOME_UI_TIMEOUT_MS,
    });
    await expect(
      page
        .getByRole("img", { name: "Comic cover image for Rocket Choir" })
        .first(),
    ).toBeVisible({
      timeout: HOME_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoBasicA11yAuditIssues(page, "/");
    await expectNoRuntimeIssues("/", runtimeIssues);
  });

  test("mobile home bottom navigation should keep visible keyboard focus", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;

      if (
        pathname === "/api/health" ||
        pathname === "/api/health/ready" ||
        pathname === "/api/health/live"
      ) {
        await fulfillJson(route, { ok: true, dbOk: true });
        return;
      }

      if (pathname === "/api/meta/version") {
        await fulfillJson(route, {
          name: "gush-backend",
          version: "0.1.0",
          commit: "test-commit",
        });
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
        await fulfillJson(route, { isSignedIn: false, user: null });
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

      if (pathname === "/api/series") {
        await fulfillJson(route, { series: HOME_SERIES });
        return;
      }

      if (pathname === "/api/search/hot") {
        await fulfillJson(route, { keywords: [] });
        return;
      }

      if (pathname === "/api/recommendations/homepage") {
        await fulfillJson(route, { slots: [] });
        return;
      }

      if (pathname === "/api/events/batch") {
        await fulfillJson(route, { ok: true });
        return;
      }

      await fulfillJson(route, {});
    });

    const runtimeIssues = collectRuntimeIssues(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const bottomNav = page.getByRole("navigation", {
      name: "Mobile bottom navigation",
    });
    const libraryTab = bottomNav.getByRole("link", {
      name: "Library",
      exact: true,
    });
    await expect(libraryTab).toBeVisible({ timeout: HOME_UI_TIMEOUT_MS });
    await tabToAndExpectVisibleFocus(page, libraryTab, {
      label: "Mobile Library bottom tab",
    });

    await page.waitForTimeout(300);
    await expectNoBasicA11yAuditIssues(page, "/");
    await expectNoRuntimeIssues("/", runtimeIssues);
  });
});
