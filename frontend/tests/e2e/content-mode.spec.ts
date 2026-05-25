import http, { type Server } from "node:http";
import { expect, test, type Page, type Route } from "@playwright/test";
import {
  createBannerPlaceholder,
  createPosterPlaceholder,
  createReaderPagePlaceholder,
} from "./support/placeholders";
import {
  TEST_BACKEND_BASE_URL,
  TEST_BACKEND_PORT,
} from "./support/mockBackendConfig";
import { TEST_FRONTEND_BASE_URL } from "./support/testBaseUrl";

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

const INTERACTIVE_SERIES = {
  id: "series-011",
  title: "Solar Wind",
  author: "Signal Drift Studio",
  type: "interactive",
  status: "Ongoing",
  adult: false,
  description: "A branching relay-field thriller.",
  coverUrl: createPosterPlaceholder("Solar Wind"),
  bannerUrl: createBannerPlaceholder("Solar Wind"),
  genres: ["Sci-Fi", "Choices", "Interactive"],
  episodeCount: 3,
  latestEpisodeId: "series-011e3",
  updatedAt: "2026-04-21T08:00:00.000Z",
};

const ADULT_INTERACTIVE_SERIES = {
  id: "series-014",
  title: "Vampire Oath",
  author: "Crimson Thread",
  type: "interactive",
  status: "Ongoing",
  adult: true,
  description: "A mature-only branching manor thriller.",
  coverUrl: createPosterPlaceholder("Vampire Oath"),
  bannerUrl: createBannerPlaceholder("Vampire Oath"),
  genres: ["Horror", "Romance", "Interactive", "Mature"],
  episodeCount: 2,
  latestEpisodeId: "series-014e2",
  updatedAt: "2026-04-22T08:00:00.000Z",
  badge: "18+",
  badges: ["Adults Only"],
  tags: ["Mature"],
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

const mockBackendState = {
  signedIn: false,
  matureConfirmed: false,
  matureModeEnabled: false,
  adultEpisodeRequests: [] as string[],
};

function jsonServerResponse(
  response: http.ServerResponse,
  status: number,
  body: unknown,
): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function createContentModeMockBackendServer() {
  return http.createServer((request, response) => {
    if (!request.url) {
      jsonServerResponse(response, 404, { error: "NOT_FOUND" });
      return;
    }

    const url = new URL(request.url, TEST_BACKEND_BASE_URL);
    const pathname = url.pathname;
    const adultFlag = url.searchParams.get("adult") === "1";
    const cookieHeader = String(request.headers.cookie || "");
    const hasSession = /(?:^|;\s*)mn_session=[^;]+(?:;|$)/.test(cookieHeader);
    const signedIn = hasSession && mockBackendState.signedIn;
    const matureVerified = signedIn && mockBackendState.matureConfirmed;
    const matureModeEnabled = signedIn && mockBackendState.matureModeEnabled;
    const activeCatalog = adultFlag
      ? [ADULT_SERIES, ADULT_NOVEL, ADULT_INTERACTIVE_SERIES]
      : [NORMAL_SERIES, NORMAL_NOVEL, INTERACTIVE_SERIES];

    if (pathname === "/api/auth/me") {
      jsonServerResponse(response, 200, {
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
      jsonServerResponse(response, 200, {
        preferences: {
          region: "global",
          language: "en",
          hideAdultHistory: !matureModeEnabled,
          matureModeEnabled,
          matureVerification: matureVerified
            ? {
                verified: true,
                provider: "content-mode-mock",
                region: "global",
                expiresAt: null,
                referenceId: null,
                verifiedAt: "2026-05-10T12:00:00.000Z",
              }
            : null,
        },
      });
      return;
    }

    if (pathname === "/api/series") {
      jsonServerResponse(response, 200, { series: activeCatalog });
      return;
    }

    if (pathname === `/api/series/${ADULT_READER_SERIES_ID}`) {
      if (!adultFlag) {
        jsonServerResponse(
          response,
          403,
          { error: "ADULT_GATED", reason: "NEED_AGE_CONFIRM" },
        );
        return;
      }

      jsonServerResponse(response, 200, ADULT_SERIES_DETAIL);
      return;
    }

    if (pathname === "/api/series/series-001") {
      jsonServerResponse(response, 200, NORMAL_SERIES_DETAIL);
      return;
    }

    if (pathname === "/api/rankings") {
      jsonServerResponse(response, 200, { rankings: activeCatalog });
      return;
    }

    if (pathname === "/api/recommendations/homepage") {
      jsonServerResponse(response, 200, {
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
      jsonServerResponse(response, 200, {
        keywords: adultFlag
          ? [{ keyword: "midnight", label: "midnight", value: "midnight" }]
          : [{ keyword: "kingdom", label: "kingdom", value: "kingdom" }],
      });
      return;
    }

    if (pathname === "/api/search") {
      const query = String(url.searchParams.get("q") || "")
        .trim()
        .toLowerCase();
      const requestedType = String(url.searchParams.get("type") || "")
        .trim()
        .toLowerCase();
      const typeFilteredCatalog =
        requestedType === "interactive"
          ? activeCatalog.filter((item) => item.type === "interactive")
          : activeCatalog;
      const results = typeFilteredCatalog.filter((item) =>
        !query ? true : item.title.toLowerCase().includes(query),
      );
      jsonServerResponse(response, 200, {
        results,
        total: results.length,
        page: 1,
        pageSize: 48,
      });
      return;
    }

    if (pathname === "/api/episode") {
      const seriesId = String(url.searchParams.get("seriesId") || "").trim();
      const episodeId = String(url.searchParams.get("episodeId") || "").trim();

      if (seriesId === ADULT_READER_SERIES_ID) {
        mockBackendState.adultEpisodeRequests.push(episodeId);
        if (!adultFlag) {
          jsonServerResponse(
            response,
            403,
            { error: "ADULT_GATED", reason: "NEED_AGE_CONFIRM" },
          );
          return;
        }

        jsonServerResponse(
          response,
          200,
          ADULT_EPISODE_PAYLOADS[
            episodeId as keyof typeof ADULT_EPISODE_PAYLOADS
          ] || ADULT_EPISODE_PAYLOADS[ADULT_READER_EPISODE_ONE],
        );
        return;
      }

      jsonServerResponse(response, 404, { error: "NOT_FOUND" });
      return;
    }

    jsonServerResponse(response, 404, { error: "NOT_FOUND" });
  });
}

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
    forgedSessionCookie?: string;
  } = {},
): Promise<void> {
  const signedIn = options.signedIn ?? false;
  const adultConfirmed = options.adultConfirmed ?? false;
  const adultMode = options.adultMode ?? false;
  const forgedSessionCookie = String(options.forgedSessionCookie || "").trim();
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
      url: TEST_FRONTEND_BASE_URL,
    },
    {
      name: "mn_session",
      value: signedIn ? "reader-session" : forgedSessionCookie,
      url: TEST_FRONTEND_BASE_URL,
    },
    {
      name: "mn_adult_confirmed",
      value: adultConfirmed ? "1" : "0",
      url: TEST_FRONTEND_BASE_URL,
    },
    {
      name: "mn_adult_mode",
      value: adultMode ? "1" : "0",
      url: TEST_FRONTEND_BASE_URL,
    },
    {
      name: "mn_mature_status",
      value: matureStatus,
      url: TEST_FRONTEND_BASE_URL,
    },
    {
      name: "mn_age_rule",
      value: "global",
      url: TEST_FRONTEND_BASE_URL,
    },
    {
      name: "mn_region",
      value: "global",
      url: TEST_FRONTEND_BASE_URL,
    },
  ]);
}

async function expectNoShellPlaceholderCopy(page: Page): Promise<void> {
  await expect(page.locator("body")).not.toContainText(
    /new Figma shell|The shell is working|old shell|placeholder/i,
  );
}

async function expectAdultHomeCatalog(page: Page): Promise<void> {
  await expect(
    page
      .getByRole(
        "heading",
        { name: /After Hours Letters|Midnight Heat|Vampire Oath/i },
      )
      .first(),
  ).toBeVisible({
    timeout: UI_TIMEOUT_MS,
  });
  await expect(page.locator("body")).toContainText(
    /After Hours Letters|Midnight Heat|Vampire Oath/i,
  );
  await expect(page.locator("body")).not.toContainText("The Last Kingdom");
  await expect(page.locator("body")).not.toContainText("Velvet Archive");
}

async function expectAdultCatalogVisible(
  page: Page,
  options: {
    headingPattern?: RegExp;
    presentTitles?: string[];
    absentTitles?: string[];
  } = {},
): Promise<void> {
  const presentTitles = options.presentTitles || [
    "After Hours Letters",
    "Midnight Heat",
  ];
  const absentTitles = options.absentTitles || [
    "The Last Kingdom",
    "Velvet Archive",
  ];

  if (options.headingPattern) {
    await expect(
      page.getByRole("heading", { name: options.headingPattern }).first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
  } else {
    await expect(page.locator("body")).toContainText(
      new RegExp(presentTitles.join("|"), "i"),
    );
  }

  for (const title of presentTitles) {
    await expect(page.locator("body")).toContainText(title);
  }

  for (const title of absentTitles) {
    await expect(page.locator("body")).not.toContainText(title);
  }
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
  mockBackendState.adultEpisodeRequests = [];
  mockBackendState.matureModeEnabled = options.adultMode;
  mockBackendState.matureConfirmed = options.adultConfirmed ?? options.adultMode;
  mockBackendState.signedIn = options.signedIn ?? options.adultMode;

  const buildVerification = () => ({
    verified: mockBackendState.matureConfirmed,
    provider: "local-gate",
    region: "global",
    expiresAt: null,
    referenceId: null,
    verifiedAt: mockBackendState.matureConfirmed
      ? "2026-05-10T12:00:00.000Z"
      : null,
  });

  await page.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const adultFlag = requestUrl.searchParams.get("adult") === "1";
  const activeCatalog = adultFlag
      ? [ADULT_SERIES, ADULT_NOVEL, ADULT_INTERACTIVE_SERIES]
      : [NORMAL_SERIES, NORMAL_NOVEL, INTERACTIVE_SERIES];

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
        isSignedIn: mockBackendState.signedIn,
        user: mockBackendState.signedIn
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
          mockBackendState.matureModeEnabled =
            nextPreferences.matureModeEnabled;
        }
        if (
          nextPreferences.matureVerification &&
          typeof nextPreferences.matureVerification === "object"
        ) {
          mockBackendState.matureConfirmed =
            nextPreferences.matureVerification.verified === true;
        }

        await fulfillJson(route, {
          ok: true,
          preferences: {
            region: "global",
            language: "en",
            hideAdultHistory: false,
            matureModeEnabled: mockBackendState.matureModeEnabled,
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
          matureModeEnabled: mockBackendState.matureModeEnabled,
          matureVerification: buildVerification(),
        },
      });
      return;
    }

    if (pathname === "/api/series") {
      await fulfillJson(route, { series: activeCatalog });
      return;
    }

    if (pathname === "/api/interactive-stories") {
      const stories = adultFlag
        ? [
            {
              id: "interactive-014",
              slug: "vampire-oath",
              title: "Vampire Oath",
              description: "A mature-only branching manor thriller.",
              coverImage: createPosterPlaceholder("Vampire Oath"),
              genre: "Horror",
              contentMode: "adult",
              status: "published",
              nodeCount: 4,
              endingCount: 2,
            },
          ]
        : [
            {
              id: "interactive-011",
              slug: "solar-wind",
              title: "Solar Wind",
              description: "A branching relay-field thriller.",
              coverImage: createPosterPlaceholder("Solar Wind"),
              genre: "Sci-Fi",
              contentMode: "normal",
              status: "published",
              nodeCount: 4,
              endingCount: 2,
            },
          ];
      await fulfillJson(route, { stories });
      return;
    }

    if (pathname === "/api/interactive-stories/slug/solar-wind") {
      if (adultFlag) {
        await fulfillJson(route, { error: "NOT_FOUND" }, 404);
        return;
      }

      await fulfillJson(route, {
        story: {
          id: "interactive-011",
          slug: "solar-wind",
          title: "Solar Wind",
          description: "A branching relay-field thriller.",
          coverImage: createPosterPlaceholder("Solar Wind"),
          genre: "Sci-Fi",
          contentMode: "normal",
          status: "published",
          nodeCount: 3,
          endingCount: 2,
          startNodeKey: "signal-arrival",
        },
      });
      return;
    }

    if (pathname === "/api/interactive-stories/slug/vampire-oath") {
      if (!adultFlag) {
        await fulfillJson(route, { error: "NOT_FOUND" }, 404);
        return;
      }

      await fulfillJson(route, {
        story: {
          id: "interactive-014",
          slug: "vampire-oath",
          title: "Vampire Oath",
          description: "A mature-only branching manor thriller.",
          coverImage: createPosterPlaceholder("Vampire Oath"),
          genre: "Horror",
          contentMode: "adult",
          status: "published",
          nodeCount: 4,
          endingCount: 2,
          startNodeKey: "crimson-vow",
        },
      });
      return;
    }

    if (pathname === "/api/interactive-stories/slug/solar-wind/current") {
      if (!mockBackendState.signedIn) {
        await fulfillJson(route, { error: "UNAUTHENTICATED" }, 401);
        return;
      }
      if (adultFlag) {
        await fulfillJson(route, { error: "NOT_FOUND" }, 404);
        return;
      }

      await fulfillJson(route, {
        progress: {
          story: {
            id: "interactive-011",
            slug: "solar-wind",
            title: "Solar Wind",
            description: "A branching relay-field thriller.",
            contentMode: "normal",
            genre: "Sci-Fi",
          },
          node: {
            id: "node-normal-1",
            title: "Signal Arrival",
            body: "You stand before the relay spine and wait for the first pulse.",
            isEnding: false,
            panels: [
              {
                id: "panel-normal-1",
                panelNumber: 1,
                imageUrl: createReaderPagePlaceholder("Solar Wind Panel"),
                dialogue: "The relay is alive. Keep your breathing even.",
              },
            ],
            choices: [
              {
                id: "choice-normal-1",
                label: "Approach the relay core",
                description: "Keep moving and follow the signal.",
                requiresPremium: false,
                requiresTokens: 0,
              },
            ],
          },
          path: ["Signal Arrival"],
          state: {
            trust: 1,
            signal: 2,
          },
        },
      });
      return;
    }

    if (pathname === "/api/interactive-stories/slug/vampire-oath/current") {
      if (!mockBackendState.signedIn) {
        await fulfillJson(route, { error: "UNAUTHENTICATED" }, 401);
        return;
      }
      if (!adultFlag) {
        await fulfillJson(route, { error: "NOT_FOUND" }, 404);
        return;
      }

      await fulfillJson(route, {
        progress: {
          story: {
            id: "interactive-014",
            slug: "vampire-oath",
            title: "Vampire Oath",
            description: "A mature-only branching manor thriller.",
            contentMode: "adult",
            genre: "Horror",
          },
          node: {
            id: "node-adult-1",
            title: "Crimson Vow",
            body: "The manor doors close and every promise starts tasting dangerous.",
            isEnding: false,
            panels: [
              {
                id: "panel-adult-1",
                panelNumber: 1,
                imageUrl: createReaderPagePlaceholder("Vampire Oath Panel"),
                dialogue: "The house remembers every oath you break.",
              },
            ],
            choices: [
              {
                id: "choice-adult-1",
                label: "Step deeper into the manor",
                description: "Follow the vow into the dark wing.",
                requiresPremium: false,
                requiresTokens: 0,
              },
            ],
          },
          path: ["Crimson Vow"],
          state: {
            hunger: 2,
            suspicion: 1,
          },
        },
      });
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
      const requestedType = String(requestUrl.searchParams.get("type") || "")
        .trim()
        .toLowerCase();
      const typeFilteredCatalog =
        requestedType === "interactive"
          ? activeCatalog.filter((item) => item.type === "interactive")
          : requestedType === "novel" || requestedType === "novels"
            ? activeCatalog.filter((item) => item.type === "novel")
            : requestedType === "comic" || requestedType === "comics"
              ? activeCatalog.filter((item) => item.type === "comic")
              : activeCatalog;
      const results = typeFilteredCatalog.filter((item) =>
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
      const requestedType = String(requestUrl.searchParams.get("type") || "")
        .trim()
        .toLowerCase();
      const typeFilteredCatalog =
        requestedType === "interactive"
          ? activeCatalog.filter((item) => item.type === "interactive")
          : requestedType === "novel" || requestedType === "novels"
            ? activeCatalog.filter((item) => item.type === "novel")
            : requestedType === "comic" || requestedType === "comics"
              ? activeCatalog.filter((item) => item.type === "comic")
              : activeCatalog;
      const suggestions = typeFilteredCatalog
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
    wasAdultEpisodeRequested: () => mockBackendState.adultEpisodeRequests.length > 0,
    getAdultEpisodeRequests: () => [...mockBackendState.adultEpisodeRequests],
  };
}

test.describe("Content mode filtering", () => {
  test.describe.configure({ mode: "serial" });
  let mockBackend: Server | undefined;

  test.beforeAll(async () => {
    mockBackend = createContentModeMockBackendServer();
    await new Promise<void>((resolve, reject) => {
      mockBackend?.once("error", reject);
      mockBackend?.listen(TEST_BACKEND_PORT, "127.0.0.1", () => resolve());
    });
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      if (!mockBackend) {
        resolve();
        return;
      }

      mockBackend.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

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

    await expectAdultHomeCatalog(page);
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

    await expectAdultCatalogVisible(page, {
      presentTitles: ["Midnight Heat"],
      absentTitles: ["The Last Kingdom", "Velvet Archive"],
    });
    await expectNoShellPlaceholderCopy(page);
  });

  test("interactive route should stay normal-only by default", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/interactive", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("body")).toContainText("Solar Wind");
    await expect(page.locator("body")).not.toContainText("Vampire Oath");
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
    await expect(page.locator("body")).not.toContainText("All Formats");
  });

  test("interactive route should stay adult-only in adult mode", async ({
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

    const response = await page.goto("/interactive", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("body")).toContainText("Vampire Oath");
    await expect(page.locator("body")).not.toContainText("Solar Wind");
    await expect(page.locator("body")).not.toContainText("Midnight Heat");
    await expect(page.locator("body")).not.toContainText("All Formats");
  });

  test("interactive detail route should block adult stories in normal mode", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/interactive/vampire-oath", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("body")).toContainText(
      "This story isn't available in the current mode.",
    );
    await expect(page.locator("body")).not.toContainText("Start Playing");
    await expect(page.locator("body")).not.toContainText("Crimson Vow");
  });

  test("interactive detail route should block normal stories in adult mode", async ({
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

    const response = await page.goto("/interactive/solar-wind", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("body")).toContainText(
      "This story isn't available in the current mode.",
    );
    await expect(page.locator("body")).not.toContainText("Signal Arrival");
    await expect(page.locator("body")).not.toContainText("Approach the relay core");
  });

  test("interactive play route should keep normal node content out of adult mode", async ({
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

    const response = await page.goto("/interactive/vampire-oath/play", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("body")).toContainText("Crimson Vow");
    await expect(page.locator("body")).toContainText(
      "The house remembers every oath you break.",
    );
    await expect(page.locator("body")).not.toContainText("Signal Arrival");
    await expect(page.locator("body")).not.toContainText(
      "The relay is alive. Keep your breathing even.",
    );
  });

  test("interactive play route should keep adult node content out of normal mode", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: true,
    });

    const response = await page.goto("/interactive/solar-wind/play", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("body")).toContainText("Signal Arrival");
    await expect(page.locator("body")).toContainText(
      "The relay is alive. Keep your breathing even.",
    );
    await expect(page.locator("body")).not.toContainText("Crimson Vow");
    await expect(page.locator("body")).not.toContainText(
      "The house remembers every oath you break.",
    );
  });

  test("forged mature cookies without session should not unlock adult SSR content", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: false,
      adultConfirmed: true,
      adultMode: true,
    });
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    let response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).not.toContainText("Midnight Heat");
    await expect(page.locator("body")).not.toContainText("After Hours Letters");

    response = await page.goto("/search?q=midnight", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).not.toContainText("Midnight Heat");

    response = await page.goto("/rankings", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).not.toContainText("Midnight Heat");

    response = await page.goto("/library", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).not.toContainText("Midnight Heat");
  });

  test("forged session plus adult cookies should not unlock adult SSR content", async ({
    page,
  }) => {
    await seedAdultState(page, {
      signedIn: false,
      adultConfirmed: true,
      adultMode: true,
      forgedSessionCookie: "forged-session",
    });
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    for (const routePath of ["/", "/search?q=midnight", "/rankings", "/library"]) {
      const response = await page.goto(routePath, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();
      await expect(page.locator("body")).not.toContainText("Midnight Heat");
      await expect(page.locator("body")).not.toContainText("After Hours Letters");
    }
  });

  test("search interactive aliases should stay interactive-only", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    let response = await page.goto("/search?type=interactive", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/interactive(?:\?|$)/);
    await expect(
      page.getByRole("heading", { name: /Pick the branch\. Own the fallout\./i }),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).toContainText("Solar Wind");
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
    await expect(page.locator("body")).not.toContainText("Velvet Archive");
    await expect(page.locator("body")).not.toContainText("All Formats");

    response = await page.goto("/search?format=interactive", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/interactive(?:\?|$)/);
    await expect(page.locator("body")).toContainText("Solar Wind");
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
    await expect(page.locator("body")).not.toContainText("Velvet Archive");
    await expect(page.locator("body")).not.toContainText("All Formats");

    response = await page.goto("/interactive", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toContainText("Solar Wind");
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
    await expect(page.locator("body")).not.toContainText("Velvet Archive");
    await expect(page.locator("body")).not.toContainText("All Formats");
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

    await expectAdultHomeCatalog(page);
    await expect(
      page
        .getByRole("button", {
          name: /Switch to standard mode|Back to normal mode/i,
        })
        .first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    await expectAdultHomeCatalog(page);
  });

  test("desktop header toggle should keep adult mode when navigating from home to search", async ({
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

    await expectAdultHomeCatalog(page);

    await page.goto("/search?q=midnight", {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page
        .getByRole("button", {
          name: /Switch to standard mode|Back to normal mode/i,
        })
        .first(),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expectAdultCatalogVisible(page, {
      presentTitles: ["Midnight Heat"],
      absentTitles: ["The Last Kingdom", "Velvet Archive"],
    });
    await expect
      .poll(() =>
        page.evaluate(() => ({
          mode: window.localStorage.getItem("mn_adult_mode") || "0",
          hasAdultCookie: document.cookie.includes("mn_adult_mode=1"),
        })),
      )
      .toEqual({
        mode: "1",
        hasAdultCookie: true,
      });
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

    await expectAdultHomeCatalog(page);
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
      .getByRole("link", { name: /Add to Library/i })
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
      page.getByRole("heading", { name: /Nothing landed this time\./i }),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(
      page
        .getByRole("searchbox", {
          name: /Search series, creators, or genres/i,
        })
        .first(),
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

  test("search footer should keep Interactive when the current page is plain search", async ({
    page,
  }) => {
    const response = await page.goto("/search", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const footer = page.locator('footer[data-site-footer="1"]').first();
    await expect(
      footer.getByRole("link", { name: "Interactive", exact: true }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Search", exact: true }),
    ).toHaveCount(0);
  });

  test("search fallback views should not collapse into repeated seed values", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/search", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const trendingRail = page.getByTestId("search-rail-trending");
    await expect(trendingRail).toBeVisible({ timeout: UI_TIMEOUT_MS });

    const titleLinks = trendingRail.getByRole("link");
    await expect(titleLinks.first()).toBeVisible({ timeout: UI_TIMEOUT_MS });

    const titles = (await titleLinks.allTextContents())
      .map((text) => text.trim())
      .filter(Boolean)
      .slice(0, 8);

    expect(titles.length).toBeGreaterThanOrEqual(2);
    expect(titles.join(" ")).toContain("The Last Kingdom");
    expect(titles.join(" ")).toContain("Velvet Archive");
    expect(new Set(titles).size).toBeGreaterThanOrEqual(2);
  });

  test("interactive footer should keep Search when the current page is the interactive route", async ({
    page,
  }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/interactive", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const footer = page.locator('footer[data-site-footer="1"]').first();
    await expect(
      footer.getByRole("link", { name: "Interactive", exact: true }),
    ).toHaveCount(0);
    await expect(
      footer.getByRole("link", { name: "Search", exact: true }),
    ).toBeVisible();
  });

  test("mobile header menu should expose Interactive and route to /interactive", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await page.getByRole("button", { name: /menu/i }).first().click();
    const interactiveLink = page
      .getByRole("link", { name: "Interactive", exact: true })
      .first();
    await expect(interactiveLink).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await expect(interactiveLink).toHaveAttribute("href", "/interactive");

    await interactiveLink.click();
    await expect(page).toHaveURL(/\/interactive(?:\?|$)/);
    await expect(
      page.getByRole("heading", { name: /Pick the branch\. Own the fallout\./i }),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).toContainText("Solar Wind");
    await expect(page.locator("body")).not.toContainText("The Last Kingdom");
    await expect(page.locator("body")).not.toContainText("Velvet Archive");
  });

  test("series footer should keep public discovery links", async ({ page }) => {
    await installContentModeRoutes(page, {
      adultMode: false,
      adultConfirmed: false,
      signedIn: false,
    });

    const response = await page.goto("/", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await page.getByRole("link", { name: "Add to Library" }).first().click();
    await expect(page).toHaveURL(/\/series\/series-001$/);

    const footer = page.locator('footer[data-site-footer="1"]').first();
    await expect(
      footer.getByRole("link", { name: "Interactive", exact: true }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Rankings", exact: true }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Search", exact: true }),
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
    await expect(page.locator("main")).not.toContainText(
      /Age Restricted Content|Enable adult mode/i,
    );
    const initialEpisodeRequests = routes.getAdultEpisodeRequests();
    if (initialEpisodeRequests.length > 0) {
      expect(initialEpisodeRequests).toEqual(
        expect.arrayContaining([ADULT_READER_EPISODE_ONE]),
      );
    }
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
    const nextEpisodeRequests = routes.getAdultEpisodeRequests();
    if (nextEpisodeRequests.length > 0) {
      expect(nextEpisodeRequests).toContain(ADULT_READER_EPISODE_TWO);
    }
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

    await expectAdultHomeCatalog(page);

    await page
      .getByRole("button", { name: /Switch to standard mode|Back to normal mode/i })
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
