import { expect, test, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const READER_UI_TIMEOUT_MS = 30000;

const seriesPayload = {
  series: {
    id: "series-001",
    title: "Rocket Choir",
    author: "Signal House",
    type: "comic",
    adult: false,
    status: "Ongoing",
    description: "Mocked series for reader discovery context tests.",
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
    { id: "series-001e3", seriesId: "series-001", number: 3, title: "Episode 3", pricePts: 0, previewFreePages: 3, ttfEligible: false },
  ],
};

const episodePayload = (episodeId: string) => ({
  episode: {
    id: episodeId,
    seriesId: "series-001",
    title: episodeId === "series-001e2" ? "Episode 2" : "Episode 1",
    type: "comic",
    pricePts: 0,
    previewFreePages: 3,
    pages: [
      { url: `https://placehold.co/800x1200/1a1a2e/ffffff.png?text=${episodeId}+P1`, w: 800, h: 1200 },
      { url: `https://placehold.co/800x1200/1a1a2e/ffffff.png?text=${episodeId}+P2`, w: 800, h: 1200 },
      { url: `https://placehold.co/800x1200/1a1a2e/ffffff.png?text=${episodeId}+P3`, w: 800, h: 1200 },
    ],
    paragraphs: [],
  },
});

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.describe("Reader discovery context", () => {
  test("reader should preserve discovery attribution while moving to the next episode", async ({ page }) => {
    test.setTimeout(60000);

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

      if (pathname === "/api/entitlements") {
        if (route.request().method() === "GET" && searchParams.get("seriesId") === "series-001") {
          await fulfillJson(route, {
            entitlement: {
              seriesId: "series-001",
              unlockedEpisodeIds: ["series-001e1", "series-001e2", "series-001e3"],
            },
          });
          return;
        }

        await fulfillJson(route, {
          entitlement: {
            seriesId: "series-001",
            unlockedEpisodeIds: ["series-001e1", "series-001e2", "series-001e3"],
          },
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

      if (pathname === "/api/progress") {
        await fulfillJson(route, { progress: [] });
        return;
      }

      if (pathname === "/api/episode") {
        await fulfillJson(route, episodePayload(searchParams.get("episodeId") || "series-001e1"));
        return;
      }

      if (pathname === "/api/series/series-001") {
        await fulfillJson(route, seriesPayload);
        return;
      }

      if (pathname === "/api/events/batch") {
        await fulfillJson(route, { ok: true });
        return;
      }

      await fulfillJson(route, {});
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto(
      "/read/series-001/series-001e1?entry=SEARCH_ZERO_RESULTS&campaignId=search_zero_breakout&sourcePath=%2Fsearch%3Fq%3Dvoid&seriesId=series-001&returnTo=%2Fseries%2Fseries-001",
      { waitUntil: "domcontentloaded" },
    );
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText("From Search | Breakout pick")).toBeVisible({
      timeout: READER_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("button", { name: "Back to search" })).toBeVisible({
      timeout: READER_UI_TIMEOUT_MS,
    });

    await Promise.all([
      page.waitForURL(
        /\/read\/series-001\/series-001e2\?entry=SEARCH_ZERO_RESULTS&campaignId=search_zero_breakout&sourcePath=%2Fsearch%3Fq%3Dvoid/,
        { timeout: READER_UI_TIMEOUT_MS, waitUntil: "domcontentloaded" },
      ),
      page.getByRole("button", { name: "Next" }).click(),
    ]);

    await expect(page.getByText("From Search | Breakout pick")).toBeVisible({
      timeout: READER_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/read/series-001/series-001e1", runtimeIssues);
  });
});
