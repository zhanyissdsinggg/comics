import { expect, test, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { createPosterPlaceholder } from "./support/placeholders";
import { expectNoBasicA11yAuditIssues } from "./support/a11yAudit";
import { tabToAndExpectVisibleFocus } from "./support/keyboard";

const SERIES_UI_TIMEOUT_MS = 15000;

const SERIES_PAYLOAD = {
  series: {
    id: "series-slot-breakout",
    title: "Rocket Choir",
    author: "Signal House",
    type: "comic",
    adult: false,
    status: "Ongoing",
    description: "Manual breakout pick tied to live search momentum.",
    coverUrl: createPosterPlaceholder("Rocket Choir"),
    rating: 4.1,
    ratingCount: 120,
    followers: 1500,
    views: 5000,
    badge: "NEW",
    badges: ["NEW"],
    genres: ["Fantasy", "Action"],
    freeEpisodeCount: 0,
    hasFreeEpisodes: false,
    isPublished: true,
    updatedAt: "2026-03-11T08:00:00.000Z",
  },
  episodes: [
    {
      id: "series-slot-breakout-e1",
      seriesId: "series-slot-breakout",
      number: 1,
      title: "Episode 1",
      pricePts: 0,
      previewFreePages: 5,
      ttfEligible: false,
    },
    {
      id: "series-slot-breakout-e2",
      seriesId: "series-slot-breakout",
      number: 2,
      title: "Episode 2",
      pricePts: 3,
      previewFreePages: 0,
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

test.describe("Series arrival context", () => {
  test("series page should explain search-driven arrival context", async ({
    page,
  }) => {
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
        await fulfillJson(route, { user: null });
        return;
      }

      if (pathname === "/api/preferences") {
        await fulfillJson(route, { adult: false, autoplay: false });
        return;
      }

      if (pathname === "/api/series/series-slot-breakout") {
        await fulfillJson(route, SERIES_PAYLOAD);
        return;
      }

      if (pathname === "/api/recommendations/similar/series-slot-breakout") {
        await fulfillJson(route, { recommendations: [] });
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
      "/series/series-slot-breakout?entry=SEARCH_ZERO_RESULTS&campaignId=search_zero_breakout&sourcePath=%2Fsearch%3Fq%3Dvoid&seriesId=series-slot-breakout&returnTo=%2Fseries%2Fseries-slot-breakout",
      { waitUntil: "domcontentloaded" },
    );
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", {
        name: "Rocket Choir is trending in search right now.",
      }),
    ).toBeVisible({ timeout: SERIES_UI_TIMEOUT_MS });
    await expect(
      page.getByRole("img", { name: "Comic cover image for Rocket Choir" }),
    ).toBeVisible({
      timeout: SERIES_UI_TIMEOUT_MS,
    });
    const arrivalPanel = page
      .locator("div")
      .filter({
        has: page.getByRole("heading", {
          name: "Rocket Choir is trending in search right now.",
        }),
      })
      .first();

    await expect(arrivalPanel.getByText("Search").first()).toBeVisible({
      timeout: SERIES_UI_TIMEOUT_MS,
    });
    await expect(arrivalPanel.getByText("Trending pick").first()).toBeVisible({
      timeout: SERIES_UI_TIMEOUT_MS,
    });
    await expect(
      arrivalPanel.getByRole("button", { name: "Back to search" }),
    ).toBeVisible({
      timeout: SERIES_UI_TIMEOUT_MS,
    });
    await tabToAndExpectVisibleFocus(
      page,
      arrivalPanel.getByRole("button", { name: "Back to search" }),
      {
        label: "Series arrival Back to search button",
      },
    );

    await page.waitForTimeout(300);
    await expectNoBasicA11yAuditIssues(page, "/series/series-slot-breakout");
    await expectNoRuntimeIssues("/series/series-slot-breakout", runtimeIssues);
  });
});
