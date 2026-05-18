import { expect, test, type Page, type Route } from "@playwright/test";
import {
  createBannerPlaceholder,
  createPosterPlaceholder,
  createReaderPagePlaceholder,
} from "./support/placeholders";

const UI_TIMEOUT_MS = 15_000;
const ADULT_READER_SERIES_ID = "series-013";
const ADULT_READER_EPISODE_ONE = `${ADULT_READER_SERIES_ID}e1`;
const ADULT_READER_EPISODE_TWO = `${ADULT_READER_SERIES_ID}e2`;

const NORMAL_SERIES = {
  id: "series-001",
  title: "The Last Kingdom",
  author: "Northline Studio",
  type: "comic",
  status: "Ongoing",
  adult: false,
  description: "A flagship normal-mode adventure title.",
  coverUrl: createPosterPlaceholder("The Last Kingdom"),
  bannerUrl: createBannerPlaceholder("The Last Kingdom"),
  genres: ["Action", "Fantasy"],
  episodeCount: 3,
  latestEpisodeId: "series-001e3",
  updatedAt: "2026-04-18T08:00:00.000Z",
};

const ADULT_SERIES = {
  id: ADULT_READER_SERIES_ID,
  title: "Midnight Heat",
  author: "Vale After Dark",
  type: "comic",
  status: "Ongoing",
  description: "A mature-only city thriller.",
  coverUrl: createPosterPlaceholder("Midnight Heat"),
  bannerUrl: createBannerPlaceholder("Midnight Heat"),
  genres: ["Mature", "Thriller"],
  badge: "18+",
  badges: ["Adults Only"],
  tags: ["Mature"],
  episodeCount: 2,
  latestEpisodeId: ADULT_READER_EPISODE_TWO,
  updatedAt: "2026-04-19T08:00:00.000Z",
};

const NORMAL_NOVEL = {
  id: "series-101",
  title: "Velvet Archive",
  author: "Lantern House",
  type: "novel",
  status: "Ongoing",
  adult: false,
  description: "A normal-mode serialized mystery novel.",
  coverUrl: createPosterPlaceholder("Velvet Archive"),
  bannerUrl: createBannerPlaceholder("Velvet Archive"),
  genres: ["Mystery", "Drama"],
  episodeCount: 4,
  latestEpisodeId: "series-101e4",
  updatedAt: "2026-04-16T08:00:00.000Z",
};

const ADULT_NOVEL = {
  id: "series-102",
  title: "After Hours Letters",
  author: "Nocturne House",
  type: "novel",
  status: "Ongoing",
  description: "A mature-only late-night letter novel.",
  coverUrl: createPosterPlaceholder("After Hours Letters"),
  bannerUrl: createBannerPlaceholder("After Hours Letters"),
  genres: ["Mature", "Romance"],
  badge: "18+",
  badges: ["Mature"],
  tags: ["Adults Only"],
  episodeCount: 3,
  latestEpisodeId: "series-102e3",
  updatedAt: "2026-04-20T08:00:00.000Z",
};

const ADULT_SERIES_DETAIL = {
  series: ADULT_SERIES,
  episodes: [
    {
      id: ADULT_READER_EPISODE_ONE,
      seriesId: ADULT_READER_SERIES_ID,
      number: 1,
      title: "Episode 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
    },
    {
      id: ADULT_READER_EPISODE_TWO,
      seriesId: ADULT_READER_SERIES_ID,
      number: 2,
      title: "Episode 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
    },
  ],
};

const NORMAL_SERIES_DETAIL = {
  series: NORMAL_SERIES,
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
    {
      id: "series-001e2",
      seriesId: "series-001",
      number: 2,
      title: "Episode 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
    },
  ],
};

const ADULT_EPISODE_PAYLOADS = {
  [ADULT_READER_EPISODE_ONE]: {
    episode: {
      id: ADULT_READER_EPISODE_ONE,
      seriesId: ADULT_READER_SERIES_ID,
      title: "Episode 1",
      type: "comic",
      pricePts: 0,
      previewFreePages: 3,
      pages: [
        {
          url: createReaderPagePlaceholder("Midnight Heat Ep1 P1"),
          w: 800,
          h: 1200,
        },
        {
          url: createReaderPagePlaceholder("Midnight Heat Ep1 P2"),
          w: 800,
          h: 1200,
        },
        {
          url: createReaderPagePlaceholder("Midnight Heat Ep1 P3"),
          w: 800,
          h: 1200,
        },
      ],
      paragraphs: [],
    },
  },
  [ADULT_READER_EPISODE_TWO]: {
    episode: {
      id: ADULT_READER_EPISODE_TWO,
      seriesId: ADULT_READER_SERIES_ID,
      title: "Episode 2",
      type: "comic",
      pricePts: 0,
      previewFreePages: 3,
      pages: [
        {
          url: createReaderPagePlaceholder("Midnight Heat Ep2 P1"),
          w: 800,
          h: 1200,
        },
        {
          url: createReaderPagePlaceholder("Midnight Heat Ep2 P2"),
          w: 800,
          h: 1200,
        },
        {
          url: createReaderPagePlaceholder("Midnight Heat Ep2 P3"),
          w: 800,
          h: 1200,
        },
      ],
      paragraphs: [],
    },
  },
};

async function fulfillJson(
  route: Route,
  body: unknown,
  status = 200,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function seedAdultState(
  page: Page,
  options: {
    signedIn?: boolean;
    adultConfirmed?: boolean;
    adultMode?: boolean;
  } = {},
): Promise<void> {
  const signedIn = options.signedIn ?? false;
  const adultConfirmed = options.adultConfirmed ?? false;
  const adultMode = options.adultMode ?? false;
  const matureStatus = encodeURIComponent(
    JSON.stringify({
      verified: adultConfirmed,
      provider: "local-gate",
      region: "global",
      expiresAt: null,
      referenceId: null,
      verifiedAt: adultConfirmed ? "2026-05-10T12:00:00.000Z" : null,
      matureModeEnabled: adultMode,
      hideAdultHistory: !adultMode,
    }),
  );

  await page.addInitScript(
    ({ adultConfirmed: nextConfirmed, adultMode: nextMode }) => {
      const verification = nextConfirmed
        ? {
            verified: true,
            provider: "local-gate",
            region: "global",
            expiresAt: null,
            referenceId: null,
            verifiedAt: "2026-05-10T12:00:00.000Z",
          }
        : {
            verified: false,
            provider: "local-gate",
            region: "global",
            expiresAt: null,
            referenceId: null,
            verifiedAt: null,
          };

      const seedIfMissing = (key: string, value: string) => {
        if (window.localStorage.getItem(key) === null) {
          window.localStorage.setItem(key, value);
        }
      };

      // Seed only once so a user-triggered toggle can survive reloads inside the same test.
      seedIfMissing("mn_region", "global");
      seedIfMissing("mn_age_rule", "global");
      seedIfMissing("mn_adult_confirmed", nextConfirmed ? "1" : "0");
      seedIfMissing("mn_adult_mode", nextMode ? "1" : "0");
      seedIfMissing("mn_mature_hidden", nextMode ? "0" : "1");
      seedIfMissing("mn_mature_verification", JSON.stringify(verification));
    },
    {
      adultConfirmed,
      adultMode,
    },
  );

  await page.context().addCookies([
    {
      name: "mn_is_signed_in",
      value: signedIn ? "1" : "0",
      url: "http://127.0.0.1:4173",
    },
    {
      name: "mn_adult_confirmed",
      value: adultConfirmed ? "1" : "0",
      url: "http://127.0.0.1:4173",
    },
    {
      name: "mn_adult_mode",
      value: adultMode ? "1" : "0",
      url: "http://127.0.0.1:4173",
    },
    {
      name: "mn_mature_status",
      value: matureStatus,
      url: "http://127.0.0.1:4173",
    },
    {
      name: "mn_age_rule",
      value: "global",
      url: "http://127.0.0.1:4173",
    },
    {
      name: "mn_region",
      value: "global",
      url: "http://127.0.0.1:4173",
    },
  ]);
}

async function expectNoShellPlaceholderCopy(page: Page): Promise<void> {
  await expect(page.locator("body")).not.toContainText(
    /new Figma shell|The shell is working|old shell|placeholder/i,
  );
}

async function expectSinglePublicChrome(page: Page): Promise<void> {
  await expect(page.locator('header[data-site-header="1"]')).toHaveCount(1);
  await expect(page.locator('footer[data-site-footer="1"]')).toHaveCount(1);
}

async function installContentModeRoutes(
  page: Page,
  options: {
    adultMode: boolean;
    adultConfirmed?: boolean;
    signedIn?: boolean;
  },
): Promise<{
  wasAdultEpisodeRequested: () => boolean;
  getAdultEpisodeRequests: () => string[];
}> {
  const adultEpisodeRequests: string[] = [];
  let matureModeEnabled = options.adultMode;
  let matureConfirmed = options.adultConfirmed ?? options.adultMode;
  let signedIn = options.signedIn ?? options.adultMode;

  const buildVerification = () => ({
    verified: matureConfirmed,
    provider: "local-gate",
    region: "global",
    expiresAt: null,
    referenceId: null,
    verifiedAt: matureConfirmed ? "2026-05-10T12:00:00.000Z" : null,
  });

  await page.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const adultFlag = requestUrl.searchParams.get("adult") === "1";
    const activeCatalog = adultFlag
      ? [ADULT_SERIES, ADULT_NOVEL]
      : [NORMAL_SERIES, NORMAL_NOVEL];

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

    if (pathname === "/api/branding") {
      await fulfillJson(route, { branding: {} });
      return;
    }

    if (pathname === "/api/regions/config") {
      await fulfillJson(route, { regions: [], defaultRegion: "US" });
      return;
    }

    if (pathname === "/api/auth/me") {
      await fulfillJson(route, {
        isSignedIn: signedIn,
        user: signedIn
          ? {
              id: "reader-001",
              email: "reader@example.com",
            }
          : null,
      });
      return;
    }

    if (pathname === "/api/preferences") {
      if (route.request().method() === "POST") {
        let payload = {};
        try {
          payload = route.request().postDataJSON() || {};
        } catch {
          payload = {};
        }

        const nextPreferences = payload?.preferences || {};
        if (typeof nextPreferences.matureModeEnabled === "boolean") {
          matureModeEnabled = nextPreferences.matureModeEnabled;
        }
        if (
          nextPreferences.matureVerification &&
          typeof nextPreferences.matureVerification === "object"
        ) {
          matureConfirmed =
            nextPreferences.matureVerification.verified === true;
        }

        await fulfillJson(route, {
          ok: true,
          preferences: {
            region: "global",
            language: "en",
            hideAdultHistory: false,
            matureModeEnabled,
            matureVerification: buildVerification(),
          },
        });
        return;
      }

      await fulfillJson(route, {
        preferences: {
          region: "global",
          language: "en",
          hideAdultHistory: false,
          matureModeEnabled,
          matureVerification: buildVerification(),
        },
      });
      return;
    }

    if (pathname === "/api/series") {
      await fulfillJson(route, { series: activeCatalog });
      return;
    }

    if (pathname === `/api/series/${ADULT_READER_SERIES_ID}`) {
      if (!adultFlag) {
        await fulfillJson(
          route,
          { error: "ADULT_GATED", reason: "NEED_AGE_CONFIRM" },
          403,
        );
        return;
      }

      await fulfillJson(route, ADULT_SERIES_DETAIL);
      return;
    }

    if (pathname === "/api/series/series-001") {
      await fulfillJson(route, NORMAL_SERIES_DETAIL);
      return;
    }

    if (pathname === "/api/rankings") {
      await fulfillJson(route, { rankings: activeCatalog });
      return;
    }

    if (pathname === "/api/recommendations/homepage") {
      await fulfillJson(route, {
        slots: [
          {
            id: "slot-home-breakout",
            slot: "home-breakout",
            seriesIds: [activeCatalog[0].id],
          },
          {
            id: "slot-home-free-start",
            slot: "home-free-start",
            seriesIds: [activeCatalog[0].id],
          },
        ],
      });
      return;
    }

    if (pathname === "/api/search/hot" || pathname === "/api/search/keywords") {
      await fulfillJson(route, {
        keywords: adultFlag
          ? [{ keyword: "midnight", label: "midnight", value: "midnight" }]
          : [{ keyword: "kingdom", label: "kingdom", value: "kingdom" }],
      });
      return;
    }

    if (pathname === "/api/search") {
      const query = String(requestUrl.searchParams.get("q") || "")
        .trim()
        .toLowerCase();
      const results = activeCatalog.filter((item) =>
        !query ? true : item.title.toLowerCase().includes(query),
      );
      await fulfillJson(route, {
        results,
        total: results.length,
        page: 1,
        pageSize: 48,
      });
      return;
    }

    if (pathname === "/api/search/suggest") {
      const query = String(requestUrl.searchParams.get("q") || "")
        .trim()
        .toLowerCase();
      const suggestions = activeCatalog
        .map((item) => item.title)
        .filter((title) => title.toLowerCase().includes(query));
      await fulfillJson(route, { suggestions });
      return;
    }

    if (pathname === "/api/wallet") {
      await fulfillJson(route, {
        wallet: {
          paidPts: 120,
          bonusPts: 30,
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

    if (pathname === "/api/follow") {
      await fulfillJson(route, { followedSeriesIds: [] });
      return;
    }

    if (pathname === "/api/coupons") {
      await fulfillJson(route, { coupons: [] });
      return;
    }

    if (pathname === "/api/entitlements") {
      await fulfillJson(route, {
        entitlements: [
          {
            seriesId: ADULT_READER_SERIES_ID,
            unlockedEpisodeIds: [
              ADULT_READER_EPISODE_ONE,
              ADULT_READER_EPISODE_TWO,
            ],
          },
        ],
      });
      return;
    }

    if (
      pathname === "/api/episode" &&
      requestUrl.searchParams.get("seriesId") === ADULT_READER_SERIES_ID
    ) {
      const requestedEpisodeId = String(
        requestUrl.searchParams.get("episodeId") || "",
      ).trim();
      adultEpisodeRequests.push(requestedEpisodeId);
      await fulfillJson(
        route,
        ADULT_EPISODE_PAYLOADS[
          requestedEpisodeId as keyof typeof ADULT_EPISODE_PAYLOADS
        ] || ADULT_EPISODE_PAYLOADS[ADULT_READER_EPISODE_ONE],
      );
      return;
    }

    if (pathname === "/api/events/batch") {
      await fulfillJson(route, { ok: true });
      return;
    }

    await fulfillJson(route, {});
  });

  return {
    wasAdultEpisodeRequested: () => adultEpisodeRequests.length > 0,
    getAdultEpisodeRequests: () => [...adultEpisodeRequests],
  };
}

test.describe("Content mode filtering", () => {
  test("the default experience should start in normal mode", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("button", { name: /Enter 18\+ mode|18\+/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(
      page.getByRole("heading", { name: /The Last Kingdom/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("Midnight Heat");
    await expect
      .poll(() =>
        page.evaluate(
          () => window.localStorage.getItem("mn_adult_mode") || "0",
        ),
      )
      .toBe("0");
    await expectNoShellPlaceholderCopy(page);
  });

  test("home should only render the normal catalog by default", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /The Last Kingdom/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("Midnight Heat");
    await expectNoShellPlaceholderCopy(page);
  });

  test("home should only render the adult catalog after adult mode is enabled", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: true,
    });
    await installContentModeRoutes(page, {
      adultMode: true,
      adultConfirmed: true,
      signedIn: true,
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /Midnight Heat/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
    await expectNoShellPlaceholderCopy(page);
  });

  test("search should query and render only the normal catalog by default", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/search?q=kingdom", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /The Last Kingdom/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("Midnight Heat");
    await expectNoShellPlaceholderCopy(page);
  });

  test("search should query and render only the adult catalog in adult mode", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: true,
    });
    await installContentModeRoutes(page, {
      adultMode: true,
      adultConfirmed: true,
      signedIn: true,
    });

    const response = await page.goto("/search?q=midnight", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /Midnight Heat/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
    await expectNoShellPlaceholderCopy(page);
  });

  test("interactive search fallback should stay normal-only by default", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/search?format=interactive", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /Neon Heir/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("Vampire Oath");
  });

  test("interactive search fallback should stay adult-only in adult mode", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: true,
    });
    await installContentModeRoutes(page, {
      adultMode: true,
      adultConfirmed: true,
      signedIn: true,
    });

    const response = await page.goto("/search?format=interactive", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /Vampire Oath/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("Neon Heir");
  });

  test("rankings should stay on the normal catalog by default", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/rankings", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /The Last Kingdom/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("Midnight Heat");
    await expectNoShellPlaceholderCopy(page);
  });

  test("rankings should switch to the adult catalog in adult mode", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: true,
    });
    await installContentModeRoutes(page, {
      adultMode: true,
      adultConfirmed: true,
      signedIn: true,
    });

    const response = await page.goto("/rankings", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /Midnight Heat/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
    await expectNoShellPlaceholderCopy(page);
  });

  test("adult mode comics should not render normal comics", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: true,
    });
    await installContentModeRoutes(page, {
      adultMode: true,
      adultConfirmed: true,
      signedIn: true,
    });

    const response = await page.goto("/comics", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /Midnight Heat/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
  });

  test("adult mode novels should not render normal novels", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: true,
    });
    await installContentModeRoutes(page, {
      adultMode: true,
      adultConfirmed: true,
      signedIn: true,
    });

    const response = await page.goto("/novels", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /After Hours Letters/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("Velvet Archive");
  });

  test("desktop header toggle should enter adult mode and keep it after refresh", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: false,
    });
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: true,
      signedIn: true,
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const desktopToggle = page
      .getByRole("button", { name: /Enter 18\+ mode|18\+/i })
      .first();
    await expect(desktopToggle).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await desktopToggle.click();
    await expect
      .poll(() =>
        page.evaluate(
          () => window.localStorage.getItem("mn_adult_mode") || "0",
        ),
      )
      .toBe("1");

    await expect(
      page.getByRole("heading", { name: /Midnight Heat/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
    await expect(
      page.getByRole("button", { name: /Back to normal mode|Normal/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /Midnight Heat/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
  });

  test("mobile bottom nav should switch with the same adult-only catalog rules", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: false,
    });
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: true,
      signedIn: true,
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const mobileToggle = page.getByTestId("mobile-content-mode-toggle");
    await expect(mobileToggle).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await mobileToggle.click();

    await expect(
      page.getByRole("heading", { name: /Midnight Heat/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
    await expect(mobileToggle).toContainText("Normal");
  });

  test("public catalog pages should keep exactly one header and one footer", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    for (const routePath of [
      "/",
      "/search",
      "/comics",
      "/novels",
      "/rankings",
    ]) {
      const response = await page.goto(routePath, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();
      await expectSinglePublicChrome(page);
    }

    await page.goto("/", {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("link", { name: /The Last Kingdom/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/series\/series-001$/);
    await expectSinglePublicChrome(page);
    await expect(
      page.getByRole("link", { name: "Interactive", exact: true }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
  });

  test("search zero-result state should render without crashing", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/search?q=zzz-no-match", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /No matches yet/i }),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(
      page.getByPlaceholder("Search titles, creators, or genres..."),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
  });

  test("catalog pages should not expose internal shelf copy", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    for (const routePath of ["/comics", "/novels"]) {
      const response = await page.goto(routePath, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();
      await expect(page.locator("body")).not.toContainText(
        /Curated Grid|Discovery Shelf|Panel Logic/i,
      );
      await expect(page.locator("body")).toContainText(
        /Editor's Picks|Explore More|Top Rated/i,
      );
    }
  });

  test("public footer should expose Interactive, Search, and Rankings links", async ({
    page,
  }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const footer = page.locator('footer[data-site-footer="1"]').first();
    await expect(
      footer.getByRole("link", { name: "Interactive" }),
    ).toBeVisible();
    await expect(footer.getByRole("link", { name: "Search" })).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /Rankings|Trending/ }),
    ).toBeVisible();
  });

  test("adult reader should stay blocked in normal mode", async ({ page }) => {
    const routes = await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto(
      `/read/${ADULT_READER_SERIES_ID}/${ADULT_READER_EPISODE_ONE}`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /Age Restricted Content/i }),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("main")).not.toContainText("Midnight Heat");
    expect(routes.wasAdultEpisodeRequested()).toBe(false);
  });

  test("adult reader should load after adult mode is enabled", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: true,
    });
    const routes = await installContentModeRoutes(page, {
      adultMode: true,
      adultConfirmed: true,
      signedIn: true,
    });

    const response = await page.goto(
      `/read/${ADULT_READER_SERIES_ID}/${ADULT_READER_EPISODE_ONE}`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText("Midnight Heat").first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(
      page.getByRole("button", { name: "Reader Settings" }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    expect(routes.wasAdultEpisodeRequested()).toBe(true);
  });

  test("adult reader next chapter should stay inside the adult catalog", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: true,
    });
    const routes = await installContentModeRoutes(page, {
      adultMode: true,
      adultConfirmed: true,
      signedIn: true,
    });

    const response = await page.goto(
      `/read/${ADULT_READER_SERIES_ID}/${ADULT_READER_EPISODE_ONE}`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("button", { name: "Next" }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: "Next" }).first().click();

    await expect(page).toHaveURL(
      new RegExp(
        `/read/${ADULT_READER_SERIES_ID}/${ADULT_READER_EPISODE_TWO}$`,
      ),
    );
    await expect(page.getByText("Midnight Heat").first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
    expect(routes.getAdultEpisodeRequests()).toEqual(
      expect.arrayContaining([
        ADULT_READER_EPISODE_ONE,
        ADULT_READER_EPISODE_TWO,
      ]),
    );
  });

  test("switching back to normal mode should remove adult catalog content", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: true,
    });
    await installContentModeRoutes(page, {
      adultMode: true,
      adultConfirmed: true,
      signedIn: true,
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /Midnight Heat/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    await page
      .getByRole("button", { name: /Back to normal mode|Normal/i })
      .first()
      .click();

    await expect(
      page.getByRole("heading", { name: /The Last Kingdom/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("Midnight Heat");
    await expect
      .poll(
        () =>
          page.evaluate(() => ({
            mode: window.localStorage.getItem("mn_adult_mode") || "0",
            hasNormalCookie: document.cookie.includes("mn_adult_mode=0"),
          })),
        { timeout: UI_TIMEOUT_MS },
      )
      .toEqual({
        mode: "0",
        hasNormalCookie: true,
      });
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /The Last Kingdom/i }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).not.toContainText("Midnight Heat");
  });
});
