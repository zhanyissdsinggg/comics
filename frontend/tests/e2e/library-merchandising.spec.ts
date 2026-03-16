import { expect, test, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const LIBRARY_UI_TIMEOUT_MS = 15000;

const catalogPayload = {
  series: [
    {
      id: "series-001",
      title: "Saved Comet",
      author: "Atlas Works",
      type: "comic",
      adult: false,
      status: "Ongoing",
      description: "Existing saved title.",
      rating: 4.4,
      ratingCount: 820,
      followers: 2100,
      views: 8800,
      badge: "HOT",
      badges: ["HOT"],
      genres: ["Action", "Sci-Fi"],
      coverUrl: "https://placehold.co/600x800/png",
      isPublished: true,
      updatedAt: "2026-03-15T08:00:00.000Z",
    },
    {
      id: "series-002",
      title: "Midnight Ledger",
      author: "Signal House",
      type: "comic",
      adult: false,
      status: "Completed",
      description: "Curated library return pick.",
      rating: 4.9,
      ratingCount: 1820,
      followers: 5400,
      views: 14200,
      badge: "NEW",
      badges: ["NEW"],
      genres: ["Mystery", "Drama"],
      coverUrl: "https://placehold.co/600x800/png",
      isPublished: true,
      updatedAt: "2026-03-15T10:00:00.000Z",
    },
    {
      id: "series-003",
      title: "Shadow Relay",
      author: "North Pier",
      type: "comic",
      adult: false,
      status: "Ongoing",
      description: "Breakout backup title.",
      rating: 4.7,
      ratingCount: 910,
      followers: 3300,
      views: 12600,
      badge: "HOT",
      badges: ["HOT"],
      genres: ["Thriller", "Action"],
      coverUrl: "https://placehold.co/600x800/png",
      isPublished: true,
      updatedAt: "2026-03-15T11:00:00.000Z",
    },
  ],
} as const;

const seriesDetailPayload = {
  series: {
    id: "series-002",
    title: "Midnight Ledger",
    author: "Signal House",
    type: "comic",
    adult: false,
    status: "Completed",
    description: "Curated library return pick.",
    rating: 4.9,
    ratingCount: 1820,
    followers: 5400,
    views: 14200,
    badge: "NEW",
    badges: ["NEW"],
    genres: ["Mystery", "Drama"],
    freeEpisodeCount: 2,
    hasFreeEpisodes: true,
    isPublished: true,
    updatedAt: "2026-03-15T10:00:00.000Z",
  },
  episodes: [
    {
      id: "series-002e1",
      seriesId: "series-002",
      number: 1,
      title: "Episode 1",
      pricePts: 0,
      previewFreePages: 5,
      ttfEligible: false,
    },
  ],
} as const;

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.describe("Library merchandising", () => {
  test("library should prioritize the admin-managed return slot before chart fallback picks", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
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
        await fulfillJson(route, { user: null });
        return;
      }

      if (pathname === "/api/preferences") {
        await fulfillJson(route, { adult: false, autoplay: false });
        return;
      }

      if (pathname === "/api/recommendations/homepage") {
        await fulfillJson(route, {
          slots: [
            {
              id: "slot-library-return",
              slot: "library-return",
              seriesIds: ["series-002"],
            },
            {
              id: "slot-home-breakout",
              slot: "home-breakout",
              seriesIds: ["series-003"],
            },
          ],
          count: 2,
        });
        return;
      }

      if (pathname === "/api/series") {
        await fulfillJson(route, catalogPayload);
        return;
      }

      if (pathname === "/api/series/series-002") {
        await fulfillJson(route, seriesDetailPayload);
        return;
      }

      if (pathname === "/api/recommendations/similar/series-002") {
        await fulfillJson(route, { recommendations: [] });
        return;
      }

      if (pathname === "/api/progress") {
        await fulfillJson(route, {
          progress: {
            "series-001": {
              lastEpisodeId: "series-001e3",
              percent: 0.5,
              updatedAt: "2026-03-15T09:00:00.000Z",
            },
          },
        });
        return;
      }

      if (pathname === "/api/history") {
        await fulfillJson(route, { history: [] });
        return;
      }

      if (pathname === "/api/follow") {
        await fulfillJson(route, { followedSeriesIds: [] });
        return;
      }

      if (pathname === "/api/bookmarks") {
        await fulfillJson(route, { bookmarks: {} });
        return;
      }

      if (pathname === "/api/events/batch") {
        await fulfillJson(route, { ok: true });
        return;
      }

      await fulfillJson(route, {});
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/library", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const recommendedRail = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Recommended for You" }),
    });

    await expect(page.getByRole("heading", { name: "Turn saved titles into clear return paths." })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    await expect(recommendedRail.getByRole("button", { name: /Midnight Ledger/i })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    await expect(recommendedRail.getByText("Merchandising return pick", { exact: true })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    await expect(recommendedRail.getByRole("button", { name: /Shadow Relay/i })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });

    await recommendedRail.getByRole("button", { name: /Midnight Ledger/i }).click();
    await page.waitForURL(
      /\/series\/series-002\?entry=LIBRARY_RETURN_SLOT&campaignId=library_return_slot&sourcePath=%2Flibrary/,
      { timeout: LIBRARY_UI_TIMEOUT_MS },
    );

    await expect(page.getByText("Library return").first()).toBeVisible({ timeout: LIBRARY_UI_TIMEOUT_MS });
    await expect(page.getByRole("button", { name: "Back to library" })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/library", runtimeIssues);
  });
});
