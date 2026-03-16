import { expect, test, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const LIBRARY_UI_TIMEOUT_MS = 15000;

const seriesPayload = {
  series: [
    {
      id: "series-001",
      title: "Rocket Choir",
      author: "Signal House",
      type: "comic",
      adult: false,
      status: "Ongoing",
      description: "Mocked library title for attribution tests.",
      rating: 4.8,
      ratingCount: 2341,
      followers: 4200,
      views: 9800,
      badge: "NEW",
      badges: ["NEW"],
      genres: ["Fantasy", "Action"],
      coverUrl: "https://placehold.co/600x800/png",
      isPublished: true,
      updatedAt: "2026-03-15T08:00:00.000Z",
    },
  ],
};

const readerSeriesPayload = {
  series: {
    id: "series-001",
    title: "Rocket Choir",
    author: "Signal House",
    type: "comic",
    adult: false,
    status: "Ongoing",
    description: "Mocked reader title for library attribution tests.",
    rating: 4.8,
    ratingCount: 2341,
    followers: 4200,
    views: 9800,
    badge: "NEW",
    badges: ["NEW"],
    genres: ["Fantasy", "Action"],
  },
  episodes: [
    { id: "series-001e1", seriesId: "series-001", number: 1, title: "Episode 1", pricePts: 0, previewFreePages: 3, ttfEligible: false },
    { id: "series-001e2", seriesId: "series-001", number: 2, title: "Episode 2", pricePts: 0, previewFreePages: 3, ttfEligible: false },
  ],
};

const episodePayload = {
  episode: {
    id: "series-001e1",
    seriesId: "series-001",
    title: "Episode 1",
    type: "comic",
    pricePts: 0,
    previewFreePages: 3,
    pages: [
      { url: "https://placehold.co/800x1200/1a1a2e/ffffff.png?text=Rocket+Choir+Ep1+P1", w: 800, h: 1200 },
      { url: "https://placehold.co/800x1200/1a1a2e/ffffff.png?text=Rocket+Choir+Ep1+P2", w: 800, h: 1200 },
      { url: "https://placehold.co/800x1200/1a1a2e/ffffff.png?text=Rocket+Choir+Ep1+P3", w: 800, h: 1200 },
    ],
    paragraphs: [],
  },
};

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.describe("Library attribution", () => {
  test("library resume actions should carry library attribution into the reader", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;
      const searchParams = requestUrl.searchParams;

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

      if (pathname === "/api/auth/me") {
        await fulfillJson(route, { user: { id: "user-001", email: "reader@example.com" } });
        return;
      }

      if (pathname === "/api/preferences") {
        await fulfillJson(route, { adult: false, autoplay: false });
        return;
      }

      if (pathname === "/api/recommendations/homepage") {
        await fulfillJson(route, { slots: [], count: 0 });
        return;
      }

      if (pathname === "/api/series") {
        await fulfillJson(route, seriesPayload);
        return;
      }

      if (pathname === "/api/series/series-001") {
        await fulfillJson(route, readerSeriesPayload);
        return;
      }

      if (pathname === "/api/progress") {
        await fulfillJson(route, {
          progress: {
            "series-001": {
              lastEpisodeId: "series-001e1",
              percent: 0.42,
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
        await fulfillJson(route, { followedSeriesIds: ["series-001"] });
        return;
      }

      if (pathname === "/api/bookmarks") {
        await fulfillJson(route, { bookmarks: {} });
        return;
      }

      if (pathname === "/api/rewards") {
        await fulfillJson(route, {
          rewards: { checkedInToday: true, streak: 3, makeUpAvailable: false, todayReward: 20 },
        });
        return;
      }

      if (pathname === "/api/missions") {
        await fulfillJson(route, { daily: [], weekly: [] });
        return;
      }

      if (pathname === "/api/entitlements") {
        await fulfillJson(route, {
          entitlement: { seriesId: "series-001", unlockedEpisodeIds: ["series-001e1", "series-001e2"] },
        });
        return;
      }

      if (pathname === "/api/wallet") {
        await fulfillJson(route, {
          paidPts: 120,
          bonusPts: 15,
          subscription: null,
          subscriptionUsage: { remaining: 0 },
        });
        return;
      }

      if (pathname === "/api/coupons") {
        await fulfillJson(route, { coupons: [] });
        return;
      }

      if (pathname === "/api/episode" && searchParams.get("seriesId") === "series-001") {
        await fulfillJson(route, episodePayload);
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

    await expect(page.getByRole("heading", { name: "Turn saved titles into clear return paths." })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("button", { name: "Resume now" })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: "Resume now" }).click();
    await page.waitForURL(
      /\/read\/series-001\/series-001e1\?entry=LIBRARY_RESUME_SPOTLIGHT&campaignId=resume_spotlight&sourcePath=%2Flibrary/,
      { timeout: LIBRARY_UI_TIMEOUT_MS },
    );

    await expect(page.getByText("From Library return | Return-session pick")).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("button", { name: "Back to library" })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/library", runtimeIssues);
  });
});
