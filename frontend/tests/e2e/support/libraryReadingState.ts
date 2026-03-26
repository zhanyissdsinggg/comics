import { devices, expect, type Browser, type BrowserContext, type Page, type Route } from "@playwright/test";
import { createPosterPlaceholder, createReaderPagePlaceholder } from "./placeholders";
import { collectRuntimeIssues, type RuntimeIssueCollector } from "./runtime";

export const MOBILE_DEVICE = devices["iPhone 13"];
export const LIBRARY_UI_TIMEOUT_MS = 15000;

export type SessionMode = "signed-in" | "signed-out";

type ProgressEntry = {
  lastEpisodeId: string;
  percent: number;
  updatedAt: string;
};

type HistoryEntry = {
  id: string;
  seriesId: string;
  episodeId: string;
  title: string;
  percent: number;
  createdAt: string;
};

export type MockState = {
  seriesCatalog: Array<Record<string, unknown>>;
  seriesDetails: Record<string, { series: Record<string, unknown>; episodes: Array<Record<string, unknown>> }>;
  episodes: Record<string, { episode: Record<string, unknown> }>;
  progress: Record<string, ProgressEntry>;
  history: HistoryEntry[];
  followedSeriesIds: string[];
  bookmarks: Record<string, Array<Record<string, unknown>>>;
  entitlements: Record<string, { seriesId: string; unlockedEpisodeIds: string[] }>;
  rewards: Record<string, unknown>;
  missions: { daily: Array<Record<string, unknown>>; weekly: Array<Record<string, unknown>> };
  wallet: Record<string, unknown>;
};

export type OpenedLibraryPage = {
  context: BrowserContext;
  page: Page;
  runtimeIssues: RuntimeIssueCollector;
};

function createSeries(options: {
  id: string;
  title: string;
  author: string;
  description: string;
  status: string;
  badge: string;
  genres: string[];
  rating: number;
  ratingCount: number;
  followers: number;
  views: number;
  updatedAt: string;
  freeEpisodeCount?: number;
  pricing?: { episodePrice: number };
}): Record<string, unknown> {
  return {
    id: options.id,
    title: options.title,
    author: options.author,
    type: "comic",
    adult: false,
    status: options.status,
    description: options.description,
    rating: options.rating,
    ratingCount: options.ratingCount,
    followers: options.followers,
    views: options.views,
    badge: options.badge,
    badges: [options.badge],
    genres: options.genres,
    coverUrl: createPosterPlaceholder(options.title),
    isPublished: true,
    updatedAt: options.updatedAt,
    freeEpisodeCount: options.freeEpisodeCount ?? 1,
    hasFreeEpisodes: (options.freeEpisodeCount ?? 1) > 0,
    pricing: options.pricing ?? { episodePrice: 29 },
    ttf: { enabled: false },
  };
}

function createEpisodes(seriesId: string, count = 2): Array<Record<string, unknown>> {
  return Array.from({ length: count }).map((_, index) => ({
    id: `${seriesId}-e${index + 1}`,
    seriesId,
    number: index + 1,
    title: `Episode ${index + 1}`,
    pricePts: 0,
    previewFreePages: 3,
    ttfEligible: false,
  }));
}

function createReaderEpisode(seriesId: string, title: string): { episode: Record<string, unknown> } {
  return {
    episode: {
      id: `${seriesId}-e1`,
      seriesId,
      title: "Episode 1",
      type: "comic",
      pricePts: 0,
      previewFreePages: 3,
      pages: [
        { url: createReaderPagePlaceholder(`${title} P1`), w: 800, h: 1200 },
        { url: createReaderPagePlaceholder(`${title} P2`), w: 800, h: 1200 },
        { url: createReaderPagePlaceholder(`${title} P3`), w: 800, h: 1200 },
      ],
      paragraphs: [],
    },
  };
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeHistory(entries: HistoryEntry[]): HistoryEntry[] {
  const deduped = new Map<string, HistoryEntry>();

  entries.forEach((entry) => {
    if (!entry?.seriesId || !entry?.episodeId) {
      return;
    }

    const key = `${entry.seriesId}:${entry.episodeId}`;
    const current = deduped.get(key);

    if (!current || toTimestamp(entry.createdAt) >= toTimestamp(current.createdAt)) {
      deduped.set(key, entry);
    }
  });

  return Array.from(deduped.values()).sort(
    (left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt),
  );
}

export function createLibraryReadingStateMock(): MockState {
  const seriesReading = createSeries({
    id: "series-reading",
    title: "Orbit Testament",
    author: "North Pier",
    description: "A returning reader pick with progress already in motion.",
    status: "Ongoing",
    badge: "HOT",
    genres: ["Action", "Sci-Fi"],
    rating: 4.8,
    ratingCount: 2140,
    followers: 6400,
    views: 18200,
    updatedAt: "2026-03-22T10:00:00.000Z",
  });
  const seriesRead = createSeries({
    id: "series-read",
    title: "Velvet Signal",
    author: "Signal House",
    description: "Completed title with a finished read state.",
    status: "Completed",
    badge: "NEW",
    genres: ["Drama", "Mystery"],
    rating: 4.9,
    ratingCount: 3321,
    followers: 7800,
    views: 24400,
    updatedAt: "2026-03-21T10:00:00.000Z",
  });
  const seriesUnread = createSeries({
    id: "series-unread",
    title: "Paper Moon",
    author: "Morrow Studio",
    description: "Saved title that has not been opened yet.",
    status: "Ongoing",
    badge: "HOT",
    genres: ["Romance", "Slice of Life"],
    rating: 4.6,
    ratingCount: 1290,
    followers: 5100,
    views: 16040,
    updatedAt: "2026-03-20T11:00:00.000Z",
  });
  const seriesFresh = createSeries({
    id: "series-fresh",
    title: "Fresh Atlas",
    author: "Atlas Works",
    description: "Fresh title used to verify new reading progress shows up in Library.",
    status: "Ongoing",
    badge: "NEW",
    genres: ["Fantasy", "Adventure"],
    rating: 4.7,
    ratingCount: 890,
    followers: 2700,
    views: 10320,
    updatedAt: "2026-03-23T09:30:00.000Z",
  });

  const catalog = [seriesReading, seriesRead, seriesUnread, seriesFresh];
  const seriesDetails = Object.fromEntries(
    catalog.map((series) => {
      const id = String(series.id);
      return [
        id,
        {
          series,
          episodes: createEpisodes(id),
        },
      ];
    }),
  );

  return {
    seriesCatalog: catalog,
    seriesDetails,
    episodes: {
      "series-reading:series-reading-e1": createReaderEpisode("series-reading", "Orbit Testament"),
      "series-read:series-read-e1": createReaderEpisode("series-read", "Velvet Signal"),
      "series-unread:series-unread-e1": createReaderEpisode("series-unread", "Paper Moon"),
      "series-fresh:series-fresh-e1": createReaderEpisode("series-fresh", "Fresh Atlas"),
    },
    progress: {
      "series-reading": {
        lastEpisodeId: "series-reading-e1",
        percent: 0.52,
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      "series-read": {
        lastEpisodeId: "series-read-e1",
        percent: 1,
        updatedAt: "2026-03-21T11:00:00.000Z",
      },
    },
    history: [
      {
        id: "history-reading",
        seriesId: "series-reading",
        episodeId: "series-reading-e1",
        title: "Orbit Testament",
        percent: 0.52,
        createdAt: "2026-03-22T10:00:00.000Z",
      },
      {
        id: "history-read",
        seriesId: "series-read",
        episodeId: "series-read-e1",
        title: "Velvet Signal",
        percent: 1,
        createdAt: "2026-03-21T11:00:00.000Z",
      },
    ],
    followedSeriesIds: ["series-reading", "series-read", "series-unread"],
    bookmarks: {},
    entitlements: {
      "series-reading": { seriesId: "series-reading", unlockedEpisodeIds: ["series-reading-e1"] },
      "series-read": { seriesId: "series-read", unlockedEpisodeIds: ["series-read-e1"] },
      "series-unread": { seriesId: "series-unread", unlockedEpisodeIds: [] },
      "series-fresh": { seriesId: "series-fresh", unlockedEpisodeIds: [] },
    },
    rewards: {
      rewardPts: 20,
      streak: 3,
      makeUpAvailable: false,
      lastCheckInDate: "2026-03-25",
    },
    missions: {
      daily: [],
      weekly: [],
    },
    wallet: {
      paidPts: 120,
      bonusPts: 15,
      plan: "free",
      subscription: null,
      subscriptionUsage: { remaining: 0 },
      subscriptionVoucher: null,
    },
  };
}

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function readRequestJson(route: Route): Record<string, unknown> {
  try {
    return route.request().postDataJSON() as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function handleApiRoute(route: Route, state: MockState, session: SessionMode): Promise<void> {
  const requestUrl = new URL(route.request().url());
  const pathname = requestUrl.pathname;
  const searchParams = requestUrl.searchParams;
  const method = route.request().method().toUpperCase();

  if (pathname === "/api/health" || pathname === "/api/health/ready" || pathname === "/api/health/live") {
    await fulfillJson(route, 200, { ok: true, dbOk: true });
    return;
  }

  if (pathname === "/api/meta/version") {
    await fulfillJson(route, 200, { name: "gush-backend", version: "0.1.0", commit: "test-commit" });
    return;
  }

  if (pathname === "/api/regions/config") {
    await fulfillJson(route, 200, { regions: [], defaultRegion: "US" });
    return;
  }

  if (pathname === "/api/branding") {
    await fulfillJson(route, 200, { branding: {} });
    return;
  }

  if (pathname === "/api/auth/me") {
    await fulfillJson(
      route,
      200,
      session === "signed-in"
        ? { isSignedIn: true, user: { id: "user-001", email: "reader@example.com" } }
        : { isSignedIn: false, user: null },
    );
    return;
  }

  if (pathname === "/api/auth/logout") {
    await fulfillJson(route, 200, { ok: true });
    return;
  }

  if (pathname === "/api/preferences") {
    await fulfillJson(route, 200, {
      preferences: {
        adult: false,
        autoplay: false,
      },
    });
    return;
  }

  if (pathname === "/api/recommendations/homepage") {
    await fulfillJson(route, 200, { slots: [], count: 0 });
    return;
  }

  if (pathname.startsWith("/api/recommendations/similar/")) {
    await fulfillJson(route, 200, { recommendations: [] });
    return;
  }

  if (pathname.startsWith("/api/recommendations/popular")) {
    await fulfillJson(route, 200, { series: [] });
    return;
  }

  if (pathname.startsWith("/api/recommendations/personalized")) {
    await fulfillJson(route, 200, { recommendations: [] });
    return;
  }

  if (pathname === "/api/series") {
    await fulfillJson(route, 200, { series: state.seriesCatalog });
    return;
  }

  if (pathname.startsWith("/api/series/")) {
    const seriesId = pathname.replace("/api/series/", "");
    await fulfillJson(route, 200, state.seriesDetails[seriesId] || { series: null, episodes: [] });
    return;
  }

  if (pathname === "/api/episode") {
    const seriesId = String(searchParams.get("seriesId") || "");
    const episodeId = String(searchParams.get("episodeId") || "");
    await fulfillJson(route, 200, state.episodes[`${seriesId}:${episodeId}`] || { episode: null });
    return;
  }

  if (pathname === "/api/progress" && method === "GET") {
    await fulfillJson(
      route,
      session === "signed-in" ? 200 : 401,
      session === "signed-in" ? { progress: state.progress } : { error: "UNAUTHENTICATED" },
    );
    return;
  }

  if (pathname === "/api/progress/update" && method === "POST") {
    const payload = readRequestJson(route);
    const seriesId = String(payload.seriesId || "");
    const lastEpisodeId = String(payload.lastEpisodeId || "");
    const percent = Number(payload.percent || 0);
    const updatedAt = new Date().toISOString();

    if (seriesId && lastEpisodeId) {
      state.progress[seriesId] = {
        lastEpisodeId,
        percent,
        updatedAt,
      };
    }

    await fulfillJson(route, 200, { ok: true, progress: state.progress });
    return;
  }

  if (pathname === "/api/history" && method === "GET") {
    await fulfillJson(
      route,
      session === "signed-in" ? 200 : 401,
      session === "signed-in" ? { history: state.history } : { error: "UNAUTHENTICATED" },
    );
    return;
  }

  if (pathname === "/api/history" && method === "POST") {
    const payload = readRequestJson(route);
    const createdAt = String(payload.createdAt || new Date().toISOString());
    const nextEntry: HistoryEntry = {
      id: String(payload.id || `history_${Date.now()}`),
      seriesId: String(payload.seriesId || ""),
      episodeId: String(payload.episodeId || ""),
      title: String(payload.title || ""),
      percent: Number(payload.percent || 0),
      createdAt,
    };

    state.history = normalizeHistory([nextEntry, ...state.history]).slice(0, 100);
    await fulfillJson(route, 200, { history: state.history });
    return;
  }

  if (pathname === "/api/follow" && method === "GET") {
    await fulfillJson(
      route,
      session === "signed-in" ? 200 : 401,
      session === "signed-in"
        ? { followedSeriesIds: state.followedSeriesIds }
        : { error: "UNAUTHENTICATED" },
    );
    return;
  }

  if (pathname === "/api/follow" && method === "POST") {
    await fulfillJson(route, 200, { followedSeriesIds: state.followedSeriesIds });
    return;
  }

  if (pathname === "/api/bookmarks" && method === "GET") {
    await fulfillJson(
      route,
      session === "signed-in" ? 200 : 401,
      session === "signed-in" ? { bookmarks: state.bookmarks } : { error: "UNAUTHENTICATED" },
    );
    return;
  }

  if (pathname === "/api/bookmarks" && (method === "POST" || method === "DELETE")) {
    await fulfillJson(route, 200, { bookmarks: state.bookmarks });
    return;
  }

  if (pathname === "/api/rewards") {
    await fulfillJson(
      route,
      session === "signed-in" ? 200 : 401,
      session === "signed-in" ? state.rewards : { error: "UNAUTHENTICATED" },
    );
    return;
  }

  if (pathname === "/api/rewards/checkin" || pathname === "/api/rewards/makeup") {
    await fulfillJson(route, 200, { state: state.rewards, rewardPts: 20, wallet: state.wallet });
    return;
  }

  if (pathname === "/api/missions" && method === "GET") {
    await fulfillJson(
      route,
      session === "signed-in" ? 200 : 401,
      session === "signed-in" ? state.missions : { error: "UNAUTHENTICATED" },
    );
    return;
  }

  if (pathname === "/api/missions/claim" || pathname === "/api/missions/report") {
    await fulfillJson(route, 200, state.missions);
    return;
  }

  if (pathname === "/api/wallet") {
    await fulfillJson(
      route,
      session === "signed-in" ? 200 : 401,
      session === "signed-in" ? { wallet: state.wallet } : { error: "UNAUTHENTICATED" },
    );
    return;
  }

  if (pathname === "/api/coupons") {
    await fulfillJson(route, 200, { coupons: [] });
    return;
  }

  if (pathname === "/api/entitlements") {
    const seriesId = String(searchParams.get("seriesId") || "");
    await fulfillJson(route, 200, {
      entitlement: state.entitlements[seriesId] || { seriesId, unlockedEpisodeIds: [] },
    });
    return;
  }

  if (pathname === "/api/comments" && method === "GET") {
    await fulfillJson(route, 200, { comments: [] });
    return;
  }

  if (pathname === "/api/comments" && method === "POST") {
    await fulfillJson(route, 200, { comments: [] });
    return;
  }

  if (pathname === "/api/ratings" && method === "POST") {
    await fulfillJson(route, 200, { rating: 4.8, ratingCount: 999 });
    return;
  }

  if (pathname === "/api/events/batch") {
    await fulfillJson(route, 200, { ok: true });
    return;
  }

  await fulfillJson(route, 200, {});
}

export async function openLibraryReadingStatePage(
  browser: Browser,
  state: MockState,
  session: SessionMode,
  path: string,
): Promise<OpenedLibraryPage> {
  const context = await browser.newContext({
    ...MOBILE_DEVICE,
  });
  await context.route("**/api/**", (route) => handleApiRoute(route, state, session));

  const page = await context.newPage();
  const runtimeIssues = collectRuntimeIssues(page);
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  return {
    context,
    page,
    runtimeIssues,
  };
}

export async function closeLibraryReadingStatePage(openedPage: OpenedLibraryPage): Promise<void> {
  await openedPage.context.close();
}

export async function getPageBodyText(page: Page): Promise<string> {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
}
