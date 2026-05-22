import http, { type Server } from "node:http";
import { expect, test, type Page, type Route } from "@playwright/test";
import {
  TEST_BACKEND_BASE_URL,
  TEST_BACKEND_PORT,
} from "./support/mockBackendConfig";

const mockBackendState = {
  signedIn: false,
  matureConfirmed: false,
  matureModeEnabled: false,
};

const NORMAL_SERIES = {
  id: "series-001",
  title: "The Last Kingdom",
  adult: false,
  type: "comic",
  coverTone: "#123456",
  coverUrl: "",
  latestEpisodeId: "series-001e3",
  episodeCount: 3,
  genres: ["Action", "Fantasy"],
  status: "Ongoing",
  description: "Flagship normal-mode adventure title.",
  creator: {
    label: "Northline Studio",
    type: "studio",
    slug: "northline-studio",
    creatorId: "creator_northline_studio",
    isFallback: false,
  },
  creatorCredits: [],
};

const ADULT_SERIES = {
  id: "series-012",
  title: "Midnight Heat",
  adult: true,
  type: "comic",
  coverTone: "#4b1730",
  coverUrl: "",
  latestEpisodeId: "series-012e2",
  episodeCount: 2,
  genres: ["Mature", "Thriller"],
  status: "Ongoing",
  description: "Late-night city thriller.",
  creator: {
    label: "Vale After Dark",
    type: "studio",
    slug: "vale-after-dark",
    creatorId: "creator_vale_after_dark",
    isFallback: false,
  },
  creatorCredits: [],
};

function jsonResponse(
  response: http.ServerResponse,
  status: number,
  body: unknown,
): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function createAdultToggleMockBackendServer() {
  return http.createServer((request, response) => {
    if (!request.url) {
      jsonResponse(response, 404, { error: "NOT_FOUND" });
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
    const activeCatalog = adultFlag ? [ADULT_SERIES] : [NORMAL_SERIES];

    if (pathname === "/api/auth/me") {
      jsonResponse(response, 200, {
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
      jsonResponse(response, 200, {
        preferences: {
          region: "global",
          hideAdultHistory: !matureModeEnabled,
          matureModeEnabled,
          matureVerification: matureVerified
            ? {
                verified: true,
                provider: "adult-toggle-mock",
                region: "global",
                expiresAt: null,
                referenceId: null,
                verifiedAt: "2026-04-24T12:00:00.000Z",
              }
            : null,
        },
      });
      return;
    }

    if (pathname === "/api/series") {
      jsonResponse(response, 200, { series: activeCatalog });
      return;
    }

    if (pathname === "/api/recommendations/homepage") {
      jsonResponse(response, 200, {
        slots: [
          {
            id: "slot-home-breakout",
            slot: "home-breakout",
            seriesIds: [activeCatalog[0].id],
          },
        ],
      });
      return;
    }

    if (pathname === "/api/regions/config") {
      jsonResponse(response, 200, { regions: [], defaultRegion: "US" });
      return;
    }

    if (pathname === "/api/branding") {
      jsonResponse(response, 200, { branding: {} });
      return;
    }

    if (
      pathname === "/api/health" ||
      pathname === "/api/health/ready" ||
      pathname === "/api/health/live"
    ) {
      jsonResponse(response, 200, { ok: true, dbOk: true });
      return;
    }

    if (pathname === "/api/meta/version") {
      jsonResponse(response, 200, {
        name: "gush-backend",
        version: "0.1.0",
        commit: "test-commit",
      });
      return;
    }

    jsonResponse(response, 404, { error: "NOT_FOUND" });
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

async function installAdultToggleRoutes(page: Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const adultFlag = requestUrl.searchParams.get("adult") === "1";
    const activeCatalog = adultFlag ? [ADULT_SERIES] : [NORMAL_SERIES];

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
      await fulfillJson(route, {
        preferences: {
          region: "global",
          hideAdultHistory: !mockBackendState.matureModeEnabled,
          matureModeEnabled: mockBackendState.matureModeEnabled,
          matureVerification: mockBackendState.matureConfirmed
            ? {
                verified: true,
                provider: "adult-toggle-mock",
                region: "global",
                expiresAt: null,
                referenceId: null,
                verifiedAt: "2026-04-24T12:00:00.000Z",
              }
            : null,
        },
      });
      return;
    }

    if (pathname === "/api/series") {
      await fulfillJson(route, { series: activeCatalog });
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
        ],
      });
      return;
    }

    await fulfillJson(route, {});
  });
}

async function seedAdultState(
  page: Page,
  options: {
    signedIn?: boolean;
    adultConfirmed?: boolean;
    adultMode?: boolean;
    sessionValue?: string;
    includeSignedInHint?: boolean;
    includeLegacyMatureStatus?: boolean;
  } = {},
): Promise<void> {
  const signedIn = options.signedIn ?? false;
  const adultConfirmed = options.adultConfirmed ?? false;
  const adultMode = options.adultMode ?? false;
  const sessionValue = String(options.sessionValue || "").trim();
  const includeSignedInHint = options.includeSignedInHint ?? true;
  const includeLegacyMatureStatus = options.includeLegacyMatureStatus ?? false;
  const matureStatus = encodeURIComponent(
    JSON.stringify({
      verified: adultConfirmed,
      provider: "local-gate",
      region: "global",
      expiresAt: null,
      referenceId: null,
      verifiedAt: adultConfirmed ? "2026-04-24T12:00:00.000Z" : null,
      matureModeEnabled: adultMode,
      hideAdultHistory: !adultMode,
    }),
  );

  mockBackendState.signedIn = signedIn;
  mockBackendState.matureConfirmed = adultConfirmed;
  mockBackendState.matureModeEnabled = adultMode;

  const cookies = [
    {
      name: "mn_session",
      value: sessionValue,
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
      name: "mn_age_rule",
      value: "global",
      url: "http://127.0.0.1:4173",
    },
  ];

  if (includeSignedInHint) {
    cookies.push({
      name: "mn_is_signed_in",
      value: signedIn ? "1" : "0",
      url: "http://127.0.0.1:4173",
    });
  }

  if (includeLegacyMatureStatus) {
    cookies.push({
      name: "mn_mature_status",
      value: matureStatus,
      url: "http://127.0.0.1:4173",
    });
  }

  await page.context().addCookies(cookies);

  await page.addInitScript(
    ({
      signedIn: nextSignedIn,
      adultConfirmed: nextAdultConfirmed,
      adultMode: nextAdultMode,
      includeLegacyMatureStatus: nextIncludeLegacyMatureStatus,
      matureStatus: nextMatureStatus,
    }) => {
      window.localStorage.setItem("cookie_consent", "accepted");
      window.localStorage.setItem("mn_region", "global");
      window.localStorage.setItem("mn_age_rule", "global");
      window.localStorage.setItem("mn_signed_in", nextSignedIn ? "1" : "0");
      window.localStorage.setItem(
        "mn_adult_confirmed",
        nextAdultConfirmed ? "1" : "0",
      );
      window.localStorage.setItem("mn_adult_mode", nextAdultMode ? "1" : "0");

      if (nextIncludeLegacyMatureStatus) {
        document.cookie = `mn_mature_status=${nextMatureStatus}; path=/`;
      }
    },
    {
      signedIn,
      adultConfirmed,
      adultMode,
      includeLegacyMatureStatus,
      matureStatus,
    },
  );
}

test.describe("Header adult toggle", () => {
  test.describe.configure({ mode: "serial" });

  let mockBackend: Server | null = null;

  test.beforeAll(async () => {
    mockBackend = createAdultToggleMockBackendServer();
    await new Promise<void>((resolve, reject) => {
      mockBackend?.once("error", reject);
      mockBackend?.listen(TEST_BACKEND_PORT, "127.0.0.1", () => resolve());
    });
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (!mockBackend) {
        resolve();
        return;
      }
      try {
        mockBackend.close(() => resolve());
      } catch {
        resolve();
      }
    });
  });

  test("mobile bottom navigation should expose the same 18+ mode entry", async ({
    page,
  }) => {
    mockBackendState.signedIn = false;
    mockBackendState.matureConfirmed = false;
    mockBackendState.matureModeEnabled = false;
    await installAdultToggleRoutes(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await page.waitForLoadState("load");
    await expect(page.locator("body")).not.toBeEmpty({ timeout: 15000 });

    const bottomNav = page.getByRole("navigation", {
      name: "Mobile bottom navigation",
    });
    await expect(bottomNav).toBeVisible();
    await expect(
      bottomNav.getByRole("button", { name: /Enter 18\+ mode|18\+/i }),
    ).toBeVisible();
  });

  test("adult route should redirect signed-out readers to login first", async ({
    page,
  }) => {
    mockBackendState.signedIn = false;
    mockBackendState.matureConfirmed = false;
    mockBackendState.matureModeEnabled = false;
    await installAdultToggleRoutes(page);
    await page.context().clearCookies();
    await page.goto("/adult", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/adult-gate\?reason=NEED_LOGIN/);
    await expect(
      page.getByRole("heading", { name: /Sign in to access Mature Mode/i }),
    ).toBeVisible();
  });

  test("adult route should require login before age confirmation when login gating is enabled", async ({
    page,
  }) => {
    await installAdultToggleRoutes(page);
    await seedAdultState(page, {
      signedIn: false,
      adultConfirmed: false,
      adultMode: false,
      includeSignedInHint: true,
      sessionValue: "",
    });

    await page.goto("/adult", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/adult-gate\?reason=NEED_LOGIN/);
    await expect(
      page.getByRole("heading", {
        name: "Sign in to access Mature Mode",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("adult route should trust real session auth even without signed-in hint cookie", async ({
    page,
  }) => {
    await installAdultToggleRoutes(page);
    await seedAdultState(page, {
      signedIn: true,
      adultConfirmed: true,
      adultMode: true,
      sessionValue: "session-token-123",
      includeSignedInHint: false,
      includeLegacyMatureStatus: true,
    });

    await page.goto("/adult", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/adult$/);
    await expect(
      page.getByRole("heading", { name: "Mature Mode On" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Turn off Mature Mode" }),
    ).toBeVisible();
    await expect(page.locator("main")).toContainText("Midnight Heat");
    await expect(page.locator("main")).not.toContainText(
      "Sign in to access Mature Mode",
    );
  });
});
