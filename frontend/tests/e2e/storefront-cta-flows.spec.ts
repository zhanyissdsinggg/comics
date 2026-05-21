import { expect, test, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { createPosterPlaceholder } from "./support/placeholders";

const UI_TIMEOUT_MS = 15000;

const SEARCH_CATALOG = [
  {
    id: "series-001",
    title: "The Last Kingdom",
    type: "comic",
    status: "Ongoing",
    adult: false,
    coverUrl: createPosterPlaceholder("The Last Kingdom"),
    genres: ["Fantasy", "Action"],
    description: "An epic tale of warriors and kingdoms fighting for survival.",
    creator: {
      label: "Mira Dane",
      type: "person",
      slug: "mira-dane-d1b324",
      creatorId: "creator_d1b324b60af520e8ed7f0f60",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_d1b324b60af520e8ed7f0f60",
        slug: "mira-dane-d1b324",
        name: "Mira Dane",
        type: "person",
        role: "author",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    episodeCount: 3,
    latestEpisodeId: "series-001e3",
    updatedAt: "2026-04-01T01:41:56.429Z",
  },
] as const;

const SEARCH_RESULTS = {
  results: SEARCH_CATALOG,
  total: 1,
  page: 1,
  pageSize: 12,
  appliedSort: "relevance",
} as const;

const SERIES_DETAIL_PAYLOAD = {
  series: {
    id: "series-001",
    title: "The Last Kingdom",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "An epic tale of warriors and kingdoms fighting for survival.",
    coverUrl: createPosterPlaceholder("The Last Kingdom"),
    genres: ["Fantasy", "Action"],
    updatedAt: "2026-04-01T01:41:56.429Z",
    creator: {
      label: "Mira Dane",
      type: "person",
      slug: "mira-dane-d1b324",
      creatorId: "creator_d1b324b60af520e8ed7f0f60",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_d1b324b60af520e8ed7f0f60",
        slug: "mira-dane-d1b324",
        name: "Mira Dane",
        type: "person",
        role: "author",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  episodes: [
    {
      id: "series-001e1",
      seriesId: "series-001",
      number: 1,
      title: "Episode 1",
      pricePts: 0,
      previewFreePages: 0,
      ttfEligible: false,
    },
    {
      id: "series-001e2",
      seriesId: "series-001",
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

test.describe("Storefront CTA flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });
  });

  test("creators directory should open the creator page for a live result", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
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

      if (pathname === "/api/series") {
        await fulfillJson(route, { series: SEARCH_CATALOG });
        return;
      }

      if (pathname === "/api/events/batch") {
        await fulfillJson(route, { ok: true });
        return;
      }

      await fulfillJson(route, {});
    });

    const response = await page.goto("/creators", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page
        .getByRole("heading", {
          name: /Creators|Browse creators/i,
        })
        .first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    const creatorCta = page
      .getByRole("link", { name: /View Mira Dane/i })
      .first();
    await expect(creatorCta).toBeVisible({ timeout: UI_TIMEOUT_MS });

    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith("/creators/"), {
        timeout: UI_TIMEOUT_MS,
      }),
      creatorCta.click(),
    ]);

    const creatorUrl = new URL(page.url());
    expect(creatorUrl.pathname).toMatch(/^\/creators\/.+/);
    expect(creatorUrl.searchParams.get("entry")).toBeNull();
    await expectNoRuntimeIssues("/creators", runtimeIssues);
  });

  test("series detail should open the first chapter from the primary reading CTA", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
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

      if (pathname === "/api/wallet") {
        await fulfillJson(route, {
          wallet: {
            paidPts: 0,
            bonusPts: 0,
            plan: "free",
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

      if (pathname === "/api/follow") {
        await fulfillJson(route, { followedSeriesIds: [] });
        return;
      }

      if (pathname === "/api/coupons") {
        await fulfillJson(route, { coupons: [] });
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

    const response = await page.goto("/series/series-001", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: "The Last Kingdom", exact: true }),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    const readChapterButton = page
      .getByRole("link", { name: /Continue Chapter 1|Start reading/i })
      .first();
    await expect(readChapterButton).toBeVisible({ timeout: UI_TIMEOUT_MS });

    await Promise.all([
      page.waitForURL("**/read/series-001/series-001e1", {
        timeout: UI_TIMEOUT_MS,
      }),
      readChapterButton.click(),
    ]);

    await expectNoRuntimeIssues("/series/series-001", runtimeIssues);
  });

  test("signed-out account and library CTAs should keep recovery and browse routes reachable", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);

    let response = await page.goto("/account", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /Account/i }),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    await Promise.all([
      page.waitForURL("**/auth/reset", { timeout: UI_TIMEOUT_MS }),
      page
        .getByRole("link", { name: "Reset password", exact: true })
        .first()
        .click(),
    ]);
    expect(new URL(page.url()).pathname).toBe("/auth/reset");

    response = await page.goto("/account", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await Promise.all([
      page.waitForURL("**/support**", { timeout: UI_TIMEOUT_MS }),
      page
        .getByRole("link", { name: "Support", exact: true })
        .first()
        .click(),
    ]);
    expect(new URL(page.url()).pathname).toBe("/support");

    response = await page.goto("/library", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(
      page.getByRole("heading", {
        name: /Your shelf\.|Your shelf starts here\./,
      }),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    await Promise.all([
      page.waitForURL("**/comics", {
        timeout: UI_TIMEOUT_MS,
      }),
      page
        .getByRole("link", { name: "Browse free chapters", exact: true })
        .first()
        .click(),
    ]);
    expect(new URL(page.url()).pathname).toBe("/comics");

    await expectNoRuntimeIssues(
      "/account + /library guest CTAs",
      runtimeIssues,
    );
  });
});
