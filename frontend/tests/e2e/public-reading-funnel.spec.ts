import http, { type Server } from "node:http";
import { expect, test, type Page, type Route } from "@playwright/test";
import {
  createBannerPlaceholder,
  createPosterPlaceholder,
  createReaderPagePlaceholder,
} from "./support/placeholders";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const UI_TIMEOUT_MS = 15000;
const BANNED_STRINGS = [
  "Demo Series",
  "Gush Demo Studio",
  "smoke test",
  "reader QA",
  "Demo Action",
  "Demo genre",
  "platform smoke tests",
  "QA",
  "fixture",
  "placeholder",
] as const;

const CATALOG = [
  {
    id: "series-001",
    title: "The Last Kingdom",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "A rogue prince fights to keep one last city from falling.",
    shortDescription: "A rogue prince fights to keep one last city from falling.",
    synopsis: "A rogue prince fights to keep one last city from falling.",
    coverUrl: createPosterPlaceholder("The Last Kingdom"),
    bannerUrl: createBannerPlaceholder("The Last Kingdom"),
    genres: ["Fantasy", "Action"],
    episodeCount: 3,
    latestEpisodeId: "series-001e3",
    updatedAt: "2026-04-20T12:00:00.000Z",
    creator: {
      label: "Mira Dane",
      type: "person",
      slug: "mira-dane-d1b324",
      creatorId: "creator_mira_dane",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_mira_dane",
        slug: "mira-dane-d1b324",
        name: "Mira Dane",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-005",
    title: "Dragon's Oath",
    type: "novel",
    status: "Completed",
    adult: false,
    description: "A street mage takes one bad deal and starts a war with dragons.",
    shortDescription: "A street mage takes one bad deal and starts a war with dragons.",
    synopsis: "A street mage takes one bad deal and starts a war with dragons.",
    coverUrl: createPosterPlaceholder("Dragon's Oath"),
    bannerUrl: createBannerPlaceholder("Dragon's Oath"),
    genres: ["Fantasy", "Adventure"],
    episodeCount: 2,
    latestEpisodeId: "series-005e2",
    updatedAt: "2026-04-14T12:00:00.000Z",
    creator: {
      label: "Rowan Vale",
      type: "person",
      slug: "rowan-vale-a4f200",
      creatorId: "creator_rowan_vale",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_rowan_vale",
        slug: "rowan-vale-a4f200",
        name: "Rowan Vale",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-009",
    title: "Rocket Choir",
    type: "comic",
    status: "Completed",
    adult: false,
    description: "A washed-up band gets drafted to sing on a doomed space run.",
    shortDescription: "A washed-up band gets drafted to sing on a doomed space run.",
    synopsis: "A washed-up band gets drafted to sing on a doomed space run.",
    coverUrl: createPosterPlaceholder("Rocket Choir"),
    bannerUrl: createBannerPlaceholder("Rocket Choir"),
    genres: ["Sci-Fi", "Comedy"],
    episodeCount: 4,
    latestEpisodeId: "series-009e4",
    updatedAt: "2026-04-08T12:00:00.000Z",
    creator: {
      label: "Northline Studio",
      type: "studio",
      slug: "northline-studio-c913e2",
      creatorId: "creator_northline_studio",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_northline_studio",
        slug: "northline-studio-c913e2",
        name: "Northline Studio",
        type: "studio",
        role: "studio",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
] as const;

const SERIES_EPISODES: Record<string, Array<Record<string, unknown>>> = {
  "series-001": [
    {
      id: "series-001e1",
      seriesId: "series-001",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-01T00:00:00.000Z",
    },
    {
      id: "series-001e2",
      seriesId: "series-001",
      number: 2,
      title: "Chapter 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-08T00:00:00.000Z",
    },
    {
      id: "series-001e3",
      seriesId: "series-001",
      number: 3,
      title: "Chapter 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-15T00:00:00.000Z",
    },
  ],
  "series-005": [
    {
      id: "series-005e1",
      seriesId: "series-005",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-02T00:00:00.000Z",
    },
    {
      id: "series-005e2",
      seriesId: "series-005",
      number: 2,
      title: "Chapter 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-09T00:00:00.000Z",
    },
  ],
  "series-009": [
    {
      id: "series-009e1",
      seriesId: "series-009",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-03-30T00:00:00.000Z",
    },
  ],
};

const CANONICAL_ROUTE_SPECS = [
  { path: "/", title: /Trending Comics, Novels, and Interactive Stories \| Gush/i, heading: /The Last Kingdom/i },
  { path: "/comics", title: /Comics/i, heading: /^Comics$/i },
  { path: "/novels", title: /Novels/i, heading: /^Novels$/i },
  { path: "/creators", title: /Creators/i, heading: /^Creators$/i },
  { path: "/search", title: /Search Comics & Novels/i, heading: /^Titles$/i },
  { path: "/rankings", title: /Trending Stories/i, heading: /Trending/i },
  { path: "/series/series-001", title: /The Last Kingdom|Story/i, heading: /The Last Kingdom/i },
  { path: "/support", title: /Support/i, heading: /Support/i },
  { path: "/account", title: /Account/i, heading: /Account/i },
  { path: "/library", title: /Library/i, heading: /Your library/i },
  { path: "/orders", title: /Orders/i, heading: /Sign in to view purchases/i },
] as const;

const BANNED_COPY_ROUTE_PATHS = [
  "/",
  "/comics",
  "/novels",
  "/creators",
  "/search",
  "/rankings",
  "/series/series-001",
] as const;

function buildSeriesPayload(seriesId: string) {
  const series = CATALOG.find((item) => item.id === seriesId);
  if (!series) {
    return null;
  }
  return {
    series,
    episodes: SERIES_EPISODES[series.id] || [],
  };
}

function buildEpisodePayload(seriesId: string, episodeId: string) {
  const episode =
    (SERIES_EPISODES[seriesId] || []).find((item) => item.id === episodeId) ||
    (SERIES_EPISODES[seriesId] || [])[0];

  return {
    episode: {
      id: episode?.id || `${seriesId}e1`,
      seriesId,
      title: String(episode?.title || "Chapter 1"),
      type: CATALOG.find((item) => item.id === seriesId)?.type || "comic",
      pricePts: 0,
      previewFreePages: 3,
      pages: [
        { url: createReaderPagePlaceholder(`${seriesId}-${episodeId}-1`), w: 800, h: 1200 },
        { url: createReaderPagePlaceholder(`${seriesId}-${episodeId}-2`), w: 800, h: 1200 },
        { url: createReaderPagePlaceholder(`${seriesId}-${episodeId}-3`), w: 800, h: 1200 },
      ],
      paragraphs: [],
    },
  };
}

function filterCatalog(searchParams: URLSearchParams) {
  const query = String(searchParams.get("q") || "").trim().toLowerCase();
  const type = String(searchParams.get("type") || "").trim().toLowerCase();
  const status = String(searchParams.get("status") || "").trim().toLowerCase();
  const genre = String(searchParams.get("genre") || "").trim().toLowerCase();

  return CATALOG.filter((series) => {
    const matchesQuery =
      !query ||
      series.title.toLowerCase().includes(query) ||
      series.description.toLowerCase().includes(query) ||
      (series.creator?.label || "").toLowerCase().includes(query) ||
      series.genres.some((item) => item.toLowerCase().includes(query));

    const matchesType = !type || type === "all" || series.type.toLowerCase() === type;
    const normalizedStatus = series.status.toLowerCase();
    const matchesStatus =
      !status ||
      status === "all" ||
      normalizedStatus === status ||
      (status === "ongoing" && normalizedStatus !== "completed");
    const matchesGenre =
      !genre || series.genres.some((item) => item.toLowerCase() === genre);

    return matchesQuery && matchesType && matchesStatus && matchesGenre;
  });
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function jsonResponse(response: http.ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function createMockBackendServer() {
  return http.createServer((request, response) => {
    if (!request.url) {
      jsonResponse(response, 404, { error: "NOT_FOUND" });
      return;
    }

    const url = new URL(request.url, "http://127.0.0.1:4000");
    const { pathname, searchParams } = url;

    if (pathname === "/api/series") {
      jsonResponse(response, 200, { series: CATALOG });
      return;
    }

    if (pathname.startsWith("/api/series/")) {
      const seriesId = pathname.split("/").pop() || "series-001";
      const payload = buildSeriesPayload(seriesId);
      if (!payload) {
        jsonResponse(response, 404, { error: "NOT_FOUND" });
        return;
      }
      jsonResponse(response, 200, payload);
      return;
    }

    if (pathname === "/api/episode") {
      const seriesId = searchParams.get("seriesId") || "series-001";
      const episodeId = searchParams.get("episodeId") || `${seriesId}e1`;
      jsonResponse(response, 200, buildEpisodePayload(seriesId, episodeId));
      return;
    }

    jsonResponse(response, 404, { error: "NOT_FOUND" });
  });
}

async function mockPublicApi(page: Page, options: { signedIn?: boolean } = {}) {
  const { signedIn = false } = options;

  await page.addInitScript(() => {
    window.localStorage.setItem("cookie_consent", "accepted");
  });

  await page.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const searchParams = requestUrl.searchParams;

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
      await fulfillJson(
        route,
        signedIn
          ? {
              isSignedIn: true,
              user: {
                id: "reader-001",
                email: "reader@example.com",
                displayName: "Reader One",
              },
            }
          : { isSignedIn: false, user: null },
      );
      return;
    }

    if (pathname === "/api/preferences") {
      await fulfillJson(route, {
        preferences: {
          adult: false,
          autoplay: false,
        },
      });
      return;
    }

    if (pathname === "/api/series") {
      await fulfillJson(route, { series: CATALOG });
      return;
    }

    if (pathname.startsWith("/api/series/")) {
      const seriesId = pathname.split("/").pop() || "series-001";
      const payload = buildSeriesPayload(seriesId);
      if (!payload) {
        await fulfillJson(route, { error: "NOT_FOUND" }, 404);
        return;
      }
      await fulfillJson(route, payload);
      return;
    }

    if (pathname === "/api/episode") {
      const seriesId = searchParams.get("seriesId") || "series-001";
      const episodeId = searchParams.get("episodeId") || `${seriesId}e1`;
      await fulfillJson(route, buildEpisodePayload(seriesId, episodeId));
      return;
    }

    if (pathname === "/api/recommendations/homepage") {
      await fulfillJson(route, {
        slots: [
          { id: "slot-home-breakout", slot: "home-breakout", seriesIds: ["series-001"] },
          { id: "slot-home-free-start", slot: "home-free-start", seriesIds: ["series-001"] },
          { id: "slot-home-binge-ready", slot: "home-binge-ready", seriesIds: ["series-009"] },
        ],
      });
      return;
    }

    if (pathname.startsWith("/api/recommendations/similar/")) {
      await fulfillJson(route, { recommendations: [] });
      return;
    }

    if (pathname.startsWith("/api/interactive-stories/by-series/")) {
      await fulfillJson(route, { story: null });
      return;
    }

    if (pathname === "/api/search") {
      const results = filterCatalog(searchParams);
      await fulfillJson(route, {
        results,
        total: results.length,
        page: 1,
        pageSize: 12,
        appliedSort: searchParams.get("sort") || "relevance",
      });
      return;
    }

    if (pathname === "/api/search/suggest") {
      const query = String(searchParams.get("q") || "").trim().toLowerCase();
      const suggestions = filterCatalog(searchParams)
        .map((series) => series.title)
        .filter((title) => title.toLowerCase().includes(query))
        .slice(0, 5);

      await fulfillJson(route, { suggestions });
      return;
    }

    if (pathname === "/api/search/keywords") {
      await fulfillJson(route, {
        keywords: ["Fantasy", "Action", "Adventure", "Comedy"],
      });
      return;
    }

    if (pathname === "/api/search/hot") {
      await fulfillJson(route, {
        keywords: [
          { keyword: "dragon", label: "dragon", value: "dragon", badge: "Hot" },
          { keyword: "mira", label: "mira", value: "mira", badge: "Hot" },
        ],
      });
      return;
    }

    if (pathname === "/api/search/log") {
      await fulfillJson(route, { ok: true });
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

    if (pathname === "/api/orders" || pathname === "/api/orders/reconcile") {
      await fulfillJson(route, { orders: [] });
      return;
    }

    if (pathname === "/api/events/batch") {
      await fulfillJson(route, { ok: true }, 201);
      return;
    }

    if (pathname === "/api/support") {
      await fulfillJson(route, { ok: true });
      return;
    }

    await fulfillJson(route, {});
  });
}

async function expectNoBannedCopy(page: Page, routePath: string) {
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  for (const banned of BANNED_STRINGS) {
    expect(bodyText, `${routePath} should not expose banned string "${banned}"`).not.toContain(
      banned.toLowerCase(),
    );
  }
}

test.describe("Public reading funnel", () => {
  test.describe.configure({ mode: "serial" });

  let mockBackend: Server | null = null;

  test.beforeAll(async () => {
    mockBackend = createMockBackendServer();
    await new Promise<void>((resolve, reject) => {
      mockBackend?.once("error", (error: NodeJS.ErrnoException) => {
        if (error?.code === "EADDRINUSE") {
          resolve();
          return;
        }
        reject(error);
      });
      mockBackend?.listen(4000, "127.0.0.1", () => resolve());
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

  test("home loads canonical hero", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { level: 1, name: "The Last Kingdom" })).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.getByTestId("home-hero-primary-cta")).toHaveText("Read Chapter 1 Free");
    await expect(page.getByTestId("home-hero-primary-cta")).toHaveAttribute(
      "href",
      /\/read\/series-001\/series-001e1$/,
    );
    await expectNoBannedCopy(page, "/");
    await expectNoRuntimeIssues("/", runtimeIssues);
  });

  test("header nav links work for comics, novels, search, account, and support", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page, { signedIn: true });
    await page.setViewportSize({ width: 390, height: 844 });

    let response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    const mobileNav = page.getByRole("navigation", {
      name: "Mobile bottom navigation",
    });

    await Promise.all([
      page.waitForURL(/\/search(?:\?|$)/, { timeout: UI_TIMEOUT_MS }),
      mobileNav.getByRole("link", { name: "Search" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Titles" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await page.getByRole("button", { name: /Open menu/i }).click();
    const menu = page.locator("div.fixed.inset-0.z-50");
    await expect(menu).toBeVisible({ timeout: UI_TIMEOUT_MS });

    await Promise.all([
      page.waitForURL(/\/comics(?:\?|$)/, { timeout: UI_TIMEOUT_MS }),
      menu.getByRole("link", { name: "Comics" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Comics" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await page.getByRole("button", { name: /Open menu/i }).click();
    await expect(menu).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await Promise.all([
      page.waitForURL(/\/novels(?:\?|$)/, { timeout: UI_TIMEOUT_MS }),
      menu.getByRole("link", { name: "Novels" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Novels" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await Promise.all([
      page.waitForURL(/\/account(?:\?|$)/, { timeout: UI_TIMEOUT_MS }),
      mobileNav.getByRole("link", { name: "Account" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Account" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await page.getByRole("button", { name: /Open menu/i }).click();
    await expect(menu).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await Promise.all([
      page.waitForURL(/\/support(?:\?|$)/, { timeout: UI_TIMEOUT_MS }),
      menu.getByRole("link", { name: "Support" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Support" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    await expectNoRuntimeIssues("header-nav-mobile", runtimeIssues);
  });

  test("search for a known title returns a result", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/search?q=dragon", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("link", { name: /Dragon's Oath/i }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.getByText(/2 results for "dragon"\./i)).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expectNoRuntimeIssues("/search?q=dragon", runtimeIssues);
  });

  test("comics title card opens canonical series detail", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/comics", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const titleCard = page.getByRole("link", { name: /The Last Kingdom/i }).first();
    await expect(titleCard).toBeVisible({ timeout: UI_TIMEOUT_MS });

    await Promise.all([
      page.waitForURL("**/series/series-001", { timeout: UI_TIMEOUT_MS }),
      titleCard.click(),
    ]);

    await expect(page.getByRole("heading", { name: "The Last Kingdom" })).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expectNoRuntimeIssues("/comics -> /series/series-001", runtimeIssues);
  });

  test("series primary CTA opens reader route", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/series/series-001", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const primaryCta = page.getByTestId("series-primary-action");
    await expect(primaryCta).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await expect(primaryCta).toHaveAttribute(
      "href",
      /\/read\/series-001\/series-001e1$/,
    );

    await Promise.all([
      page.waitForURL("**/read/series-001/series-001e1", {
        timeout: UI_TIMEOUT_MS,
      }),
      primaryCta.click(),
    ]);

    await expect(page.getByText("Chapter 1").first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expectNoRuntimeIssues("/series/series-001 -> reader", runtimeIssues);
  });

  test("chapter list links open reader route", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/series/series-001", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const chapterAction = page.locator("#episode-series-001e2 a").first();
    await expect(chapterAction).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await expect(chapterAction).toHaveAttribute(
      "href",
      /\/read\/series-001\/series-001e2$/,
    );

    await Promise.all([
      page.waitForURL("**/read/series-001/series-001e2", {
        timeout: UI_TIMEOUT_MS,
      }),
      chapterAction.click(),
    ]);

    await expect(page.getByText("Chapter 2").first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expectNoRuntimeIssues("/series/series-001 chapter list", runtimeIssues);
  });

  test("creator link opens creator detail without demo or QA copy", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/series/series-001", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await Promise.all([
      page.waitForURL("**/creators/mira-dane-d1b324**", { timeout: UI_TIMEOUT_MS }),
      page.getByTestId("series-creator-link").click(),
    ]);

    await expect(page.getByRole("heading", { name: "Mira Dane" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expectNoBannedCopy(page, "/creators/mira-dane-d1b324");
    await expectNoRuntimeIssues("/creators/mira-dane-d1b324", runtimeIssues);
  });

  test("store and membership links stay hidden when prelaunch flags are disabled", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("link", { name: "Store" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Plans" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Membership" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Orders" })).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/Point packs/i);
    await expect(page.locator("body")).not.toContainText(/Compare plans/i);
    await expectNoRuntimeIssues("prelaunch-commerce-hidden", runtimeIssues);
  });

  test("support form renders and validates reply email for signed-out users", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    let supportRequestCount = 0;

    await mockPublicApi(page);
    await page.route("**/api/support", async (route) => {
      supportRequestCount += 1;
      await fulfillJson(route, { ok: true });
    });

    const response = await page.goto("/support", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Send a request" })).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await page.selectOption("#support-topic", "billing");
    await page.fill("#support-subject", "Need help");
    await page.fill("#support-message", "I need a billing receipt.");
    await page.click("button[type='submit']");

    await expect(page.locator("#support-email")).toHaveAttribute("required", "");
    const emailValidationMessage = await page.locator("#support-email").evaluate((element) =>
      element instanceof HTMLInputElement ? element.validationMessage : "",
    );
    expect(emailValidationMessage).toBeTruthy();
    expect(supportRequestCount).toBe(0);
    await expectNoRuntimeIssues("/support validation", runtimeIssues);
  });

  test("canonical public pages keep expected headings and ban internal copy", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    for (const routeSpec of CANONICAL_ROUTE_SPECS) {
      const response = await page.goto(routeSpec.path, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${routeSpec.path} should load`).toBeTruthy();

      await expect(page).toHaveTitle(routeSpec.title);
      await expect(page.getByRole("heading", { name: routeSpec.heading }).first()).toBeVisible({
        timeout: UI_TIMEOUT_MS,
      });
      await expectNoBannedCopy(page, routeSpec.path);
    }

    await expectNoRuntimeIssues("canonical-public-routes", runtimeIssues);
  });

  test("public catalog routes stay free of demo and fixture copy", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    for (const routePath of BANNED_COPY_ROUTE_PATHS) {
      const response = await page.goto(routePath, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();
      await expectNoBannedCopy(page, routePath);
    }

    await expectNoRuntimeIssues("public-banned-copy-crawl", runtimeIssues);
  });
});
