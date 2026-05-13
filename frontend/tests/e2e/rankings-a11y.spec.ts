import { expect, test, type Route } from "@playwright/test";
import { createPosterPlaceholder } from "./support/placeholders";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { expectNoBasicA11yAuditIssues } from "./support/a11yAudit";
import { tabToAndExpectVisibleFocus } from "./support/keyboard";

const RANKINGS_UI_TIMEOUT_MS = 15000;
const RANKINGS_LIST = [
  {
    id: "series-rank-1",
    title: "Crimson Orbit",
    author: "Northline Studio",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "Lead ranking entry used for accessibility verification.",
    coverUrl: createPosterPlaceholder("Crimson Orbit"),
    coverTone:
      "linear-gradient(160deg, rgba(47,107,255,0.18) 0%, rgba(15,23,42,0.12) 100%)",
    badge: "Trending",
    badges: ["Trending"],
    genres: ["Fantasy", "Action"],
    episodeCount: 42,
    latestEpisodeId: "series-rank-1-e42",
    freeEpisodeCount: 3,
    hasFreeEpisodes: true,
    rating: 4.8,
    ratingCount: 4200,
    followers: 12000,
    views: 56000,
    isPublished: true,
    updatedAt: "2026-03-26T08:00:00.000Z",
  },
  {
    id: "series-rank-2",
    title: "Velvet Relay",
    author: "Signal House",
    type: "comic",
    status: "Completed",
    adult: false,
    description: "Supporting ranking entry used for shared cover checks.",
    coverUrl: createPosterPlaceholder("Velvet Relay"),
    coverTone:
      "linear-gradient(160deg, rgba(249,115,22,0.18) 0%, rgba(15,23,42,0.10) 100%)",
    badge: "Completed",
    badges: ["Completed"],
    genres: ["Drama", "Mystery"],
    episodeCount: 26,
    latestEpisodeId: "series-rank-2-e26",
    freeEpisodeCount: 0,
    hasFreeEpisodes: false,
    rating: 4.7,
    ratingCount: 2600,
    followers: 8400,
    views: 31000,
    isPublished: true,
    updatedAt: "2026-03-25T08:00:00.000Z",
  },
  {
    id: "series-rank-3",
    title: "Paper Halo",
    author: "Blue Meadow",
    type: "novel",
    status: "Ongoing",
    adult: false,
    description: "Novel ranking entry used to verify typed alt text.",
    coverUrl: createPosterPlaceholder("Paper Halo"),
    coverTone:
      "linear-gradient(160deg, rgba(16,185,129,0.18) 0%, rgba(15,23,42,0.10) 100%)",
    badge: "New",
    badges: ["New"],
    genres: ["Romance", "Fantasy"],
    episodeCount: 18,
    latestEpisodeId: "series-rank-3-e18",
    freeEpisodeCount: 2,
    hasFreeEpisodes: true,
    rating: 4.6,
    ratingCount: 1800,
    followers: 5400,
    views: 22000,
    isPublished: true,
    updatedAt: "2026-03-24T08:00:00.000Z",
  },
  {
    id: "series-rank-4",
    title: "Neon Trial",
    author: "Morrow Studio",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "Board entry used for list cover verification.",
    coverUrl: createPosterPlaceholder("Neon Trial"),
    coverTone:
      "linear-gradient(160deg, rgba(168,85,247,0.18) 0%, rgba(15,23,42,0.10) 100%)",
    badge: "",
    badges: [],
    genres: ["Sci-Fi", "Thriller"],
    episodeCount: 30,
    latestEpisodeId: "series-rank-4-e30",
    freeEpisodeCount: 1,
    hasFreeEpisodes: true,
    rating: 4.5,
    ratingCount: 1200,
    followers: 4300,
    views: 19400,
    isPublished: true,
    updatedAt: "2026-03-23T08:00:00.000Z",
  },
] as const;

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.describe("Rankings accessibility", () => {
  test("rankings should expose typed cover alt text and visible keyboard focus on editorial filters", async ({
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

      if (pathname === "/api/rankings") {
        await fulfillJson(route, { rankings: RANKINGS_LIST });
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

    const response = await page.goto("/rankings?type=popular&window=all", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: "Featured stories." }),
    ).toBeVisible({
      timeout: RANKINGS_UI_TIMEOUT_MS,
    });
    await expect(
      page.getByRole("img", { name: "Comic cover image for Crimson Orbit" }),
    ).toBeVisible({
      timeout: RANKINGS_UI_TIMEOUT_MS,
    });
    await expect(
      page.getByRole("img", { name: "Comic cover image for Velvet Relay" }),
    ).toBeVisible({
      timeout: RANKINGS_UI_TIMEOUT_MS,
    });
    await expect(
      page.getByRole("img", { name: "Novel cover image for Paper Halo" }),
    ).toBeVisible({
      timeout: RANKINGS_UI_TIMEOUT_MS,
    });
    await expect(
      page.getByRole("img", { name: "Comic cover image for Neon Trial" }),
    ).toBeVisible({
      timeout: RANKINGS_UI_TIMEOUT_MS,
    });

    const featuredFilter = page.getByRole("button", {
      name: "Featured",
      exact: true,
    });
    await expect(featuredFilter).toBeVisible({
      timeout: RANKINGS_UI_TIMEOUT_MS,
    });
    await tabToAndExpectVisibleFocus(page, featuredFilter, {
      label: "Rankings Featured filter",
    });

    await page.waitForTimeout(300);
    await expectNoBasicA11yAuditIssues(
      page,
      "/rankings?type=popular&window=all",
    );
    await expectNoRuntimeIssues(
      "/rankings?type=popular&window=all",
      runtimeIssues,
    );
  });
});
