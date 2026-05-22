import { expect, test, type Route } from "@playwright/test";

const UI_TIMEOUT_MS = 15000;

const SERIES_DETAIL_PAYLOAD = {
  series: {
    id: "series-001",
    title: "The Last Kingdom",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "An epic tale of warriors and kingdoms fighting for survival.",
    coverUrl: "/mock-covers/series-001.jpg",
    bannerUrl: "/mock-covers/series-001.jpg",
    genres: ["Fantasy", "Action"],
    updatedAt: "2026-04-01T01:41:56.429Z",
  },
  episodes: [
    {
      id: "series-001e1",
      seriesId: "series-001",
      number: 1,
      title: "Episode 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
    },
  ],
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockSignedOutSeriesPage(page: Parameters<typeof test>[0]["page"]) {
  await page.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const method = route.request().method();

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
          region: "global",
          language: "en",
          hideAdultHistory: false,
          matureModeEnabled: false,
          matureVerification: null,
        },
      });
      return;
    }

    if (pathname === "/api/wallet") {
      await fulfillJson(route, {
        wallet: {
          paidPts: 0,
          bonusPts: 0,
          subscription: null,
          subscriptionUsage: { remaining: 0 },
        },
      });
      return;
    }

    if (pathname === "/api/progress") {
      await fulfillJson(route, { progress: {} });
      return;
    }

    if (pathname === "/api/entitlements") {
      await fulfillJson(route, { entitlements: [] });
      return;
    }

    if (pathname === "/api/coupons") {
      await fulfillJson(route, { coupons: [] });
      return;
    }

    if (pathname === "/api/follow" && method === "GET") {
      await fulfillJson(route, { followedSeriesIds: [] });
      return;
    }

    if (pathname === "/api/follow" && method === "POST") {
      await fulfillJson(route, { error: "UNAUTHENTICATED" }, 401);
      return;
    }

    if (pathname === "/api/comments" && method === "GET") {
      await fulfillJson(route, { comments: [] });
      return;
    }

    if (pathname === "/api/comments" && method === "POST") {
      await fulfillJson(route, { error: "UNAUTHENTICATED" }, 401);
      return;
    }

    if (pathname === "/api/series/series-001") {
      await fulfillJson(route, SERIES_DETAIL_PAYLOAD);
      return;
    }

    if (pathname === "/api/recommendations/similar/series-001") {
      await fulfillJson(route, { recommendations: [] });
      return;
    }

    if (pathname === "/api/events/batch") {
      await fulfillJson(route, { ok: true });
      return;
    }

    await fulfillJson(route, {});
  });
}

test.describe("Auth-required UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });
  });

  test("signed-out library action should open login modal on series page", async ({
    page,
  }) => {
    await mockSignedOutSeriesPage(page);

    const response = await page.goto("/series/series-001", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("button", { name: /Add to Library/i }).first(),
    ).toBeVisible({ timeout: UI_TIMEOUT_MS });

    await page.getByRole("button", { name: /Add to Library/i }).first().click();

    await expect(
      page.getByRole("heading", { name: /^Sign in$/i }).first(),
    ).toBeVisible({ timeout: UI_TIMEOUT_MS });
  });

  test("signed-out comment action should open login modal instead of failing silently", async ({
    page,
  }) => {
    await mockSignedOutSeriesPage(page);

    const response = await page.goto("/series/series-001", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("button", { name: /^Comment$/i }).first(),
    ).toBeVisible({ timeout: UI_TIMEOUT_MS });

    await page.getByRole("button", { name: /^Comment$/i }).first().click();

    await expect(
      page.getByRole("heading", { name: /^Sign in$/i }).first(),
    ).toBeVisible({ timeout: UI_TIMEOUT_MS });
  });

  test("interactive route should render dedicated interactive search entry", async ({
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
        await fulfillJson(route, { isSignedIn: false, user: null });
        return;
      }

      if (pathname === "/api/preferences") {
        await fulfillJson(route, {
          preferences: {
            region: "global",
            language: "en",
            hideAdultHistory: false,
            matureModeEnabled: false,
            matureVerification: null,
          },
        });
        return;
      }

      if (pathname === "/api/search") {
        await fulfillJson(route, {
          results: [
            {
              id: "series-011",
              title: "Solar Wind",
              author: "Signal Drift Studio",
              type: "interactive",
              status: "Ongoing",
              adult: false,
              description: "A branching relay-field thriller.",
              coverUrl: "/mock-covers/series-011.jpg",
              bannerUrl: "/mock-covers/series-011.jpg",
              genres: ["Sci-Fi", "Choices", "Interactive"],
              latestEpisodeId: "series-011e3",
              episodeCount: 3,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 48,
        });
        return;
      }

      if (pathname === "/api/search/hot") {
        await fulfillJson(route, { keywords: [] });
        return;
      }

      if (pathname === "/api/events/batch") {
        await fulfillJson(route, { ok: true });
        return;
      }

      await fulfillJson(route, {});
    });

    const response = await page.goto("/interactive", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("button", { name: /Interactive/i }).first(),
    ).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await expect(
      page.getByRole("heading", { name: /Solar Wind/i }).first(),
    ).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await expect(page).toHaveURL(/\/interactive$/);
  });
});
