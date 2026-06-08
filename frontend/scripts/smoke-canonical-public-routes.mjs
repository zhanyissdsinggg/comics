import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const buildIdPath = path.join(frontendRoot, ".next", "BUILD_ID");

const ROUTE_SPECS = [
  { path: "/", expectedTitle: "Trending Comics, Novels, and Interactive Stories | Gush", expectedHeading: "" },
  { path: "/comics", expectedTitle: "Comics", expectedHeading: "Crimson Tide" },
  { path: "/novels", expectedTitle: "Novels", expectedHeading: "Solar Wind" },
  { path: "/creators", expectedTitle: "Creators", expectedHeading: "Find the shelf behind the story you keep opening." },
  { path: "/search", expectedTitle: "Search Comics & Novels", expectedHeading: "Find your next read" },
  { path: "/rankings", expectedTitle: "Trending Stories", expectedHeading: "Live Board" },
  { path: "/series/series-001", expectedTitle: "The Last Kingdom", expectedHeading: "The Last Kingdom" },
  { path: "/series/series-004", expectedTitle: "Cherry Blossom High", expectedHeading: "Cherry Blossom High" },
  { path: "/series/series-005", expectedTitle: "Dragon's Oath", expectedHeading: "Dragon's Oath" },
  { path: "/series/series-009", expectedTitle: "Starfall Academy", expectedHeading: "Starfall Academy" },
  { path: "/series/series-010", expectedTitle: "Crimson Tide", expectedHeading: "Crimson Tide" },
  { path: "/series/series-011", expectedTitle: "Solar Wind", expectedHeading: "Solar Wind" },
  { path: "/store", expectedTitle: "Store", expectedHeading: "Store" },
  { path: "/subscribe", expectedTitle: "Plans", expectedHeading: "Plans" },
  { path: "/support", expectedTitle: "Support", expectedHeading: "Support" },
  { path: "/account", expectedTitle: "Account", expectedHeading: "Account" },
  { path: "/library", expectedTitle: "Library", expectedHeading: "Your library" },
  { path: "/orders", expectedTitle: "Orders", expectedHeading: "Sign in to view purchases" },
];

const EXPECTED_404_ROUTES = [
  "/series/demo-series",
  "/read/demo-series/demo-seriese1",
  "/creators/gush-demo-studio-c6420d",
];

const BANNED_COPY = [
  "Demo Series",
  "Gush Demo Studio",
  "Demo Action",
  "Demo Episode",
  "Demo genre",
  "platform smoke tests",
  "QA",
  "smoke test",
  "reader QA",
  "fixture",
  "placeholder",
];

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
    coverUrl: "/mock-covers/series-001.jpg",
    bannerUrl: "/mock-covers/series-001.jpg",
    rating: 9.2,
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
    id: "series-004",
    title: "Cherry Blossom High",
    type: "comic",
    status: "Completed",
    adult: false,
    description: "A sweet high school romance blooms during one last spring festival.",
    shortDescription: "A sweet high school romance blooms during one last spring festival.",
    synopsis: "A sweet high school romance blooms during one last spring festival.",
    coverUrl: "/mock-covers/series-004.jpg",
    bannerUrl: "/mock-covers/series-004.jpg",
    rating: 9.1,
    genres: ["Romance", "Comedy"],
    episodeCount: 3,
    latestEpisodeId: "series-004e3",
    updatedAt: "2026-04-11T12:00:00.000Z",
    creator: {
      label: "Hana Seo",
      type: "person",
      slug: "hana-seo-b0a4d1",
      creatorId: "creator_hana_seo",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_hana_seo",
        slug: "hana-seo-b0a4d1",
        name: "Hana Seo",
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
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "A street mage takes one bad deal and starts a war with dragons.",
    shortDescription: "A street mage takes one bad deal and starts a war with dragons.",
    synopsis: "A street mage takes one bad deal and starts a war with dragons.",
    coverUrl: "/mock-covers/series-005.jpg",
    bannerUrl: "/mock-covers/series-005.jpg",
    rating: 9.3,
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
    title: "Starfall Academy",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "A scholarship student finds out the academy's stars are hiding a dangerous secret.",
    shortDescription: "A scholarship student finds out the academy's stars are hiding a dangerous secret.",
    synopsis: "A scholarship student finds out the academy's stars are hiding a dangerous secret.",
    coverUrl: "/mock-covers/series-009.jpg",
    bannerUrl: "/mock-covers/series-009.jpg",
    rating: 9.4,
    genres: ["Fantasy", "School Life"],
    episodeCount: 3,
    latestEpisodeId: "series-009e3",
    updatedAt: "2026-04-18T12:00:00.000Z",
    creator: {
      label: "Naomi Vale",
      type: "person",
      slug: "naomi-vale-f7a3c1",
      creatorId: "creator_naomi_vale",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_naomi_vale",
        slug: "naomi-vale-f7a3c1",
        name: "Naomi Vale",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-010",
    title: "Crimson Tide",
    type: "comic",
    status: "Completed",
    adult: false,
    description: "A hunter tracks a blood-red curse through a ruined harbor city.",
    shortDescription: "A hunter tracks a blood-red curse through a ruined harbor city.",
    synopsis: "A hunter tracks a blood-red curse through a ruined harbor city.",
    coverUrl: "/mock-covers/series-010.jpg",
    bannerUrl: "/mock-covers/series-010.jpg",
    rating: 9.5,
    genres: ["Horror", "Action"],
    episodeCount: 3,
    latestEpisodeId: "series-010e3",
    updatedAt: "2026-04-09T12:00:00.000Z",
    creator: {
      label: "Rook Hollow Studio",
      type: "studio",
      slug: "rook-hollow-studio-71ad24",
      creatorId: "creator_rook_hollow_studio",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_rook_hollow_studio",
        slug: "rook-hollow-studio-71ad24",
        name: "Rook Hollow Studio",
        type: "studio",
        role: "studio",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-011",
    title: "Solar Wind",
    type: "novel",
    status: "Ongoing",
    adult: false,
    description: "Two rival cadets fake a truce to survive a broken station orbit.",
    shortDescription: "Two rival cadets fake a truce to survive a broken station orbit.",
    synopsis: "Two rival cadets fake a truce to survive a broken station orbit.",
    coverUrl: "/mock-covers/series-011.jpg",
    bannerUrl: "/mock-covers/series-011.jpg",
    rating: 9.9,
    genres: ["Sci-Fi", "Drama"],
    episodeCount: 3,
    latestEpisodeId: "series-011e3",
    updatedAt: "2026-04-23T12:00:00.000Z",
    creator: {
      label: "Nova Hart",
      type: "person",
      slug: "nova-hart-b37e12",
      creatorId: "creator_nova_hart",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_nova_hart",
        slug: "nova-hart-b37e12",
        name: "Nova Hart",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
];

const SERIES_EPISODES = {
  "series-001": [
    { id: "series-001e1", seriesId: "series-001", number: 1, title: "Chapter 1", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-01T00:00:00.000Z" },
    { id: "series-001e2", seriesId: "series-001", number: 2, title: "Chapter 2", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-08T00:00:00.000Z" },
    { id: "series-001e3", seriesId: "series-001", number: 3, title: "Chapter 3", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-15T00:00:00.000Z" },
  ],
  "series-004": [
    { id: "series-004e1", seriesId: "series-004", number: 1, title: "Chapter 1", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-01T00:00:00.000Z" },
    { id: "series-004e2", seriesId: "series-004", number: 2, title: "Chapter 2", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-08T00:00:00.000Z" },
    { id: "series-004e3", seriesId: "series-004", number: 3, title: "Chapter 3", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-15T00:00:00.000Z" },
  ],
  "series-005": [
    { id: "series-005e1", seriesId: "series-005", number: 1, title: "Chapter 1", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-02T00:00:00.000Z" },
    { id: "series-005e2", seriesId: "series-005", number: 2, title: "Chapter 2", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-09T00:00:00.000Z" },
    { id: "series-005e3", seriesId: "series-005", number: 3, title: "Chapter 3", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-16T00:00:00.000Z" },
  ],
  "series-009": [
    { id: "series-009e1", seriesId: "series-009", number: 1, title: "Chapter 1", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-04T00:00:00.000Z" },
    { id: "series-009e2", seriesId: "series-009", number: 2, title: "Chapter 2", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-11T00:00:00.000Z" },
    { id: "series-009e3", seriesId: "series-009", number: 3, title: "Chapter 3", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-18T00:00:00.000Z" },
  ],
  "series-010": [
    { id: "series-010e1", seriesId: "series-010", number: 1, title: "Chapter 1", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-03-28T00:00:00.000Z" },
    { id: "series-010e2", seriesId: "series-010", number: 2, title: "Chapter 2", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-04T00:00:00.000Z" },
    { id: "series-010e3", seriesId: "series-010", number: 3, title: "Chapter 3", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-11T00:00:00.000Z" },
  ],
  "series-011": [
    { id: "series-011e1", seriesId: "series-011", number: 1, title: "Episode 1", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-03T00:00:00.000Z" },
    { id: "series-011e2", seriesId: "series-011", number: 2, title: "Episode 2", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-10T00:00:00.000Z" },
    { id: "series-011e3", seriesId: "series-011", number: 3, title: "Episode 3", pricePts: 0, previewFreePages: 3, ttfEligible: false, releasedAt: "2026-04-17T00:00:00.000Z" },
  ],
};

const BILLING_AVAILABILITY = {
  billingMode: "demo",
  purchaseActionsEnabled: true,
  subscriptionActionsEnabled: true,
  refundActionsEnabled: true,
};

const TOPUP_PACKAGES = [
  {
    packageId: "starter",
    paidPts: 50,
    bonusPts: 5,
    price: 3.99,
    currency: "USD",
    active: true,
    label: "Starter",
    tags: [],
  },
  {
    packageId: "value",
    paidPts: 200,
    bonusPts: 40,
    price: 14.99,
    currency: "USD",
    active: true,
    label: "Value",
    tags: ["best"],
  },
];

const SUBSCRIPTION_PLANS = [
  {
    id: "basic",
    title: "Basic",
    discountPct: 10,
    dailyFreeUnlocks: 1,
    ttfMultiplier: 0.8,
    voucherPts: 2,
    price: 4.99,
    currency: "USD",
  },
  {
    id: "pro",
    title: "Pro",
    discountPct: 20,
    dailyFreeUnlocks: 2,
    ttfMultiplier: 0.6,
    voucherPts: 3,
    price: 7.99,
    currency: "USD",
  },
  {
    id: "vip",
    title: "VIP",
    discountPct: 30,
    dailyFreeUnlocks: 3,
    ttfMultiplier: 0.5,
    voucherPts: 5,
    price: 12.99,
    currency: "USD",
  },
];

function buildSeriesPayload(seriesId) {
  if (seriesId === "demo-series" || seriesId === "fixture-series") {
    return null;
  }
  const series = CATALOG.find((item) => item.id === seriesId);
  if (!series) {
    return null;
  }
  return {
    series,
    episodes: SERIES_EPISODES[series.id] || [],
  };
}

function jsonResponse(response, status, body) {
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

    const url = new URL(request.url, "http://127.0.0.1");
    const { pathname } = url;

    if (pathname === "/api/series") {
      jsonResponse(response, 200, { series: CATALOG });
      return;
    }

    if (pathname.startsWith("/api/series/")) {
      const seriesId = pathname.split("/").pop() || "";
      const payload = buildSeriesPayload(seriesId);
      if (!payload) {
        jsonResponse(response, 404, { error: "NOT_FOUND" });
        return;
      }
      jsonResponse(response, 200, payload);
      return;
    }

    if (pathname === "/api/episode") {
      const seriesId = url.searchParams.get("seriesId") || "";
      const episodeId = url.searchParams.get("episodeId") || "";
      const seriesPayload = buildSeriesPayload(seriesId);
      const episode =
        (seriesPayload?.episodes || []).find((item) => item.id === episodeId) || null;
      if (!seriesPayload || !episode) {
        jsonResponse(response, 404, { error: "NOT_FOUND" });
        return;
      }
      jsonResponse(response, 200, { episode });
      return;
    }

    if (pathname === "/api/search/hot") {
      jsonResponse(response, 200, { keywords: ["dragon", "mira", "fantasy"] });
      return;
    }

    if (pathname === "/api/rankings") {
      jsonResponse(response, 200, { rankings: CATALOG });
      return;
    }

    if (pathname === "/api/recommendations/homepage") {
      jsonResponse(response, 200, {
        slots: [
          { id: "slot-home-breakout", slot: "home-breakout", seriesIds: ["series-011"] },
          { id: "slot-home-free-start", slot: "home-free-start", seriesIds: ["series-011"] },
          { id: "slot-home-binge-ready", slot: "home-binge-ready", seriesIds: ["series-009"] },
        ],
      });
      return;
    }

    if (pathname === "/api/billing/topups") {
      jsonResponse(response, 200, {
        packages: TOPUP_PACKAGES,
        billing: BILLING_AVAILABILITY,
      });
      return;
    }

    if (pathname === "/api/billing/plans") {
      jsonResponse(response, 200, {
        plans: SUBSCRIPTION_PLANS,
        billing: BILLING_AVAILABILITY,
      });
      return;
    }

    jsonResponse(response, 404, { error: "NOT_FOUND" });
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to allocate port"));
        return;
      }
      server.close(() => resolve(address.port));
    });
    server.on("error", reject);
  });
}

async function waitForServer(baseUrl, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) {
        return;
      }
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for Next.js server");
}

function stripTags(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractTitle(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return stripTags(match?.[1] || "");
}

function extractFirstHeading(html) {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    return stripTags(h1Match[1]);
  }

  const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  if (h2Match) {
    return stripTags(h2Match[1]);
  }

  return "";
}

function resolveHeading(html, expectedHeading) {
  const extractedHeading = extractFirstHeading(html);
  if (extractedHeading) {
    return extractedHeading;
  }

  if (expectedHeading && html.toLowerCase().includes(expectedHeading.toLowerCase())) {
    return expectedHeading;
  }

  return "";
}

function extractHomePrimaryCtaHref(html) {
  const patterns = [
    /<a[^>]*href=["'](\/read\/[^"']+)["'][^>]*>/i,
    /<a[^>]*data-testid=["']home-hero-primary-cta["'][^>]*href=["']([^"']+)["']/i,
    /<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?Start Reading[\s\S]*?<\/a>/i,
    /<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?Continue reading[\s\S]*?<\/a>/i,
    /<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?Start Playing[\s\S]*?<\/a>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return String(match[1]).trim();
    }
  }

  return "";
}

function assertSeriesReaderLinks(html, seriesId) {
  const normalizedSeriesId = String(seriesId || "").trim();
  const primaryCtaPatterns = [
    /<a[^>]*data-testid=["']series-primary-action["'][^>]*href=["']([^"']+)["']/i,
    new RegExp(
      `<a[^>]*href=["'](\\/read\\/${escapeRegExp(normalizedSeriesId)}\\/[^"']+)["'][^>]*>`,
      "i",
    ),
  ];

  let primaryHref = "";
  for (const pattern of primaryCtaPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      primaryHref = String(match[1]).trim();
      break;
    }
  }

  if (!primaryHref) {
    throw new Error(`/series/${normalizedSeriesId} is missing a primary reader anchor`);
  }

  const expectedEpisodeHrefs = [
    `/read/${normalizedSeriesId}/${normalizedSeriesId}e1`,
    `/read/${normalizedSeriesId}/${normalizedSeriesId}e2`,
    `/read/${normalizedSeriesId}/${normalizedSeriesId}e3`,
  ];

  for (const href of expectedEpisodeHrefs) {
    if (!html.includes(`href="${href}"`) && !html.includes(`href='${href}'`)) {
      throw new Error(`/series/${normalizedSeriesId} is missing reader link "${href}"`);
    }
  }
}

function assertHeaderAndFooterSingle(html, pathname) {
  const headerMatches =
    html.match(/<header\b[^>]*data-site-header=["']1["'][^>]*>/gi) || [];
  const footerMatches =
    html.match(/<footer\b[^>]*data-site-footer=["']1["'][^>]*>/gi) || [];

  if (headerMatches.length !== 1) {
    throw new Error(`${pathname} should render exactly one site header, found ${headerMatches.length}`);
  }

  if (footerMatches.length !== 1) {
    throw new Error(`${pathname} should render exactly one site footer, found ${footerMatches.length}`);
  }
}

function assertSeriesMainContentOrder(html, pathname, format) {
  const mainStart = html.indexOf("<main");
  const mainEnd = html.indexOf("</main>", mainStart);
  const footerIndex = html.indexOf('data-site-footer="1"');
  const mainHtml =
    mainStart >= 0 && mainEnd > mainStart ? html.slice(mainStart, mainEnd) : html;
  const listMarker =
    String(format || "").toLowerCase() === "novel" ? "Episodes" : "Chapters";
  const entryIndex = mainHtml.indexOf(listMarker);

  if (entryIndex < 0) {
    throw new Error(`${pathname} should server-render ${listMarker} inside <main>`);
  }

  if (footerIndex < 0) {
    throw new Error(`${pathname} footer must render after the entry list in server HTML`);
  }

  if (mainStart >= 0 && mainEnd >= 0 && footerIndex < mainEnd) {
    throw new Error(`${pathname} footer must render after the entry list in server HTML`);
  }
}

function assertSubscribeCommerce(html) {
  const requiredCopy = ["Monthly plans", "$4.99", "$7.99", "$12.99"];

  for (const phrase of requiredCopy) {
    if (!html.includes(phrase)) {
      throw new Error(`/subscribe commercial page is missing "${phrase}"`);
    }
  }
}

function assertStoreCommerce(html) {
  if (/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) {
    throw new Error(`/store commercial page should not publish a noindex robots tag`);
  }

  if (html.includes("Points are coming soon")) {
    throw new Error(`/store commercial page should not render coming-soon copy`);
  }
}

function assertSeriesPrelaunchChrome(html, seriesId) {
  const forbidden = ["Point packs", "Membership", "VISA", "MC"];
  for (const phrase of forbidden) {
    if (html.includes(phrase)) {
      throw new Error(`/series/${seriesId} should not expose prelaunch commercial chrome "${phrase}"`);
    }
  }
}

function assertSeriesTerminology(html, seriesId, format) {
  const normalizedFormat = String(format || "").toLowerCase();
  if (normalizedFormat === "comic") {
    if (!html.includes("Chapter")) {
      throw new Error(`/series/${seriesId} should use "Chapter" terminology for comics`);
    }
    if (html.includes("Latest Episode") || html.includes(">Episode<")) {
      throw new Error(`/series/${seriesId} should not leak episode terminology for a comic`);
    }
    return;
  }

  if (normalizedFormat === "novel") {
    if (!html.includes("Episode")) {
      throw new Error(`/series/${seriesId} should use "Episode" terminology for novels`);
    }
    if (html.includes("Latest Chapter") || html.includes(">Chapter<")) {
      throw new Error(`/series/${seriesId} should not leak chapter terminology for a novel`);
    }
  }
}

function assertHomepageSeriesCardLinks(html) {
  const homepageSeriesLinks =
    html.match(/<a[^>]*href=["']\/series\/[^"']+["'][^>]*>/gi) || [];
  if (homepageSeriesLinks.length < 3) {
    throw new Error(`/ should render multiple homepage title card anchors, found ${homepageSeriesLinks.length}`);
  }

  if (/<a[^>]*href=["']\/_next\/image[^"']*["'][^>]*>/i.test(html)) {
    throw new Error(`/ should not link homepage cards to /_next/image assets`);
  }
}

function assertReaderFallback(html, seriesId, episodeId, episodeLabel) {
  if (!html.includes(episodeLabel)) {
    throw new Error(`/read/${seriesId}/${episodeId} should render "${episodeLabel}" in the SSR fallback`);
  }
  if (!html.includes(`/series/${seriesId}`)) {
    throw new Error(`/read/${seriesId}/${episodeId} should include a back link to /series/${seriesId}`);
  }
}

function buildVariantPath(pathname) {
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}campaignId=canonical-test&entry=nav&returnTo=%2Frankings&sourcePath=%2Frankings`;
}

async function fetchRoute(baseUrl, pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}`);
  }

  const html = await response.text();
  return {
    html,
    text: stripTags(html),
    title: extractTitle(html),
    heading: "",
  };
}

async function fetchRouteAllowing404(baseUrl, pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  const html = await response.text();
  return {
    status: response.status,
    html,
    text: stripTags(html),
  };
}

async function run() {
  if (!fs.existsSync(buildIdPath)) {
    throw new Error(`Missing production build artifact at ${buildIdPath}. Run "npm --prefix frontend run build" first.`);
  }

  const port = await getFreePort();
  const backendPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
  const nextBin = path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next");

  if (!fs.existsSync(nextBin)) {
    throw new Error(`Unable to find Next.js CLI at ${nextBin}. Run "npm --prefix frontend install" first.`);
  }

  let stdoutLog = "";
  let stderrLog = "";
  const mockBackend = createMockBackendServer();
  await new Promise((resolve, reject) => {
    mockBackend.once("error", reject);
    mockBackend.listen(backendPort, "127.0.0.1", () => resolve());
  });
  const child = spawn(
    process.execPath,
    [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"],
    {
      cwd: frontendRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXT_DIST_DIR: ".next",
        API_BASE_URL: backendBaseUrl,
        NEXT_PUBLIC_API_BASE_URL: backendBaseUrl,
      },
    },
  );

  child.stdout.on("data", (chunk) => {
    stdoutLog += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderrLog += chunk.toString();
  });

  const childExit = new Promise((_, reject) => {
    child.once("error", (error) => {
      reject(new Error(`Failed to start Next.js smoke server: ${error.message}`));
    });
    child.once("exit", (code, signal) => {
      reject(
        new Error(
          [
            `Next.js smoke server exited before checks completed (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
            stdoutLog ? `stdout:\n${stdoutLog.trim()}` : "",
            stderrLog ? `stderr:\n${stderrLog.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        ),
      );
    });
  });

  try {
    await Promise.race([waitForServer(baseUrl), childExit]);

    for (const spec of ROUTE_SPECS) {
      const direct = await fetchRoute(baseUrl, spec.path);
      const variant = await fetchRoute(baseUrl, buildVariantPath(spec.path));
      direct.heading = resolveHeading(direct.html, spec.expectedHeading);
      variant.heading = resolveHeading(variant.html, spec.expectedHeading);

      assertHeaderAndFooterSingle(direct.html, spec.path);
      assertHeaderAndFooterSingle(variant.html, `${spec.path} (variant)`);

      if (!direct.title) {
        throw new Error(`${spec.path} is missing a page title`);
      }
      if (!direct.heading) {
        throw new Error(`${spec.path} is missing a visible heading`);
      }
      if (direct.title !== variant.title) {
        throw new Error(
          `${spec.path} changed title between direct and attributed visits: "${direct.title}" vs "${variant.title}"`,
        );
      }
      if (direct.heading !== variant.heading) {
        throw new Error(
          `${spec.path} changed heading between direct and attributed visits: "${direct.heading}" vs "${variant.heading}"`,
        );
      }

      if (spec.expectedTitle && !direct.title.includes(spec.expectedTitle)) {
        throw new Error(`${spec.path} title mismatch: "${direct.title}"`);
      }
      if (
        spec.expectedHeading &&
        !direct.heading.toLowerCase().includes(spec.expectedHeading.toLowerCase())
      ) {
        throw new Error(`${spec.path} heading mismatch: "${direct.heading}"`);
      }

      if (spec.path === "/") {
        const secondPass = await fetchRoute(baseUrl, spec.path);
        secondPass.heading = resolveHeading(secondPass.html, spec.expectedHeading);
        const directHref = extractHomePrimaryCtaHref(direct.html);
        const variantHref = extractHomePrimaryCtaHref(variant.html);
        if (!directHref) {
          throw new Error('/ is missing the home hero reading anchor href');
        }
        if (directHref !== variantHref) {
          throw new Error(
            `/ changed hero CTA href between direct and attributed visits: "${directHref}" vs "${variantHref}"`,
          );
        }
        if (!/^\/read\/[^/]+\/[^/]+$/.test(directHref)) {
          throw new Error(`/ hero CTA must point to a readable chapter, got "${directHref}"`);
        }
        if (direct.title !== secondPass.title || direct.heading !== secondPass.heading) {
          throw new Error(
            `/ homepage hero is unstable across consecutive requests: "${direct.title}/${direct.heading}" vs "${secondPass.title}/${secondPass.heading}"`,
          );
        }
        assertHomepageSeriesCardLinks(direct.html);
      }

      if (spec.path === "/series/series-001") {
        assertSeriesMainContentOrder(direct.html, spec.path, "comic");
        assertSeriesReaderLinks(direct.html, "series-001");
        assertSeriesTerminology(direct.html, "series-001", "comic");
        assertSeriesPrelaunchChrome(direct.html, "series-001");
      }

      if (spec.path === "/series/series-004") {
        assertSeriesMainContentOrder(direct.html, spec.path, "comic");
        assertSeriesReaderLinks(direct.html, "series-004");
        assertSeriesTerminology(direct.html, "series-004", "comic");
        assertSeriesPrelaunchChrome(direct.html, "series-004");
      }

      if (spec.path === "/series/series-005") {
        assertSeriesMainContentOrder(direct.html, spec.path, "comic");
        assertSeriesReaderLinks(direct.html, "series-005");
        assertSeriesTerminology(direct.html, "series-005", "comic");
        assertSeriesPrelaunchChrome(direct.html, "series-005");
      }

      if (spec.path === "/series/series-009") {
        assertSeriesMainContentOrder(direct.html, spec.path, "comic");
        assertSeriesReaderLinks(direct.html, "series-009");
        assertSeriesTerminology(direct.html, "series-009", "comic");
        assertSeriesPrelaunchChrome(direct.html, "series-009");
        if (!direct.html.includes("Chapter 3")) {
          throw new Error('/series/series-009 should show "Chapter 3" as the latest entry');
        }
      }

      if (spec.path === "/series/series-010") {
        assertSeriesMainContentOrder(direct.html, spec.path, "comic");
        assertSeriesReaderLinks(direct.html, "series-010");
        assertSeriesTerminology(direct.html, "series-010", "comic");
        assertSeriesPrelaunchChrome(direct.html, "series-010");
      }

      if (spec.path === "/series/series-011") {
        assertSeriesMainContentOrder(direct.html, spec.path, "novel");
        assertSeriesReaderLinks(direct.html, "series-011");
        assertSeriesTerminology(direct.html, "series-011", "novel");
        assertSeriesPrelaunchChrome(direct.html, "series-011");
      }

      if (spec.path === "/subscribe") {
        assertSubscribeCommerce(direct.html);
        assertSubscribeCommerce(variant.html);
      }

      if (spec.path === "/store") {
        assertStoreCommerce(direct.html);
        assertStoreCommerce(variant.html);
      }

      for (const phrase of BANNED_COPY) {
        const directText = direct.text.toLowerCase();
        const variantText = variant.text.toLowerCase();
        if (
          directText.includes(phrase.toLowerCase()) ||
          variantText.includes(phrase.toLowerCase())
        ) {
          throw new Error(`${spec.path} still exposes banned copy: "${phrase}"`);
        }
      }

      console.log(
        `[canonical-smoke] PASS ${spec.path} -> title="${direct.title}" heading="${direct.heading}"`,
      );
    }

    for (const routePath of EXPECTED_404_ROUTES) {
      const response = await fetchRouteAllowing404(baseUrl, routePath);
      if (response.status !== 404) {
        throw new Error(`${routePath} should return 404, got ${response.status}`);
      }
      for (const phrase of BANNED_COPY) {
        if (response.text.toLowerCase().includes(phrase.toLowerCase())) {
          throw new Error(`${routePath} 404 page still exposes banned copy: "${phrase}"`);
        }
      }
      console.log(`[canonical-smoke] PASS ${routePath} -> 404`);
    }

    const readerResponse = await fetchRoute(baseUrl, "/read/series-011/series-011e1");
    assertReaderFallback(
      readerResponse.html,
      "series-011",
      "series-011e1",
      "Episode 1",
    );
    for (const phrase of BANNED_COPY) {
      if (readerResponse.text.toLowerCase().includes(phrase.toLowerCase())) {
        throw new Error(`/read/series-011/series-011e1 still exposes banned copy: "${phrase}"`);
      }
    }
    console.log("[canonical-smoke] PASS /read/series-011/series-011e1 -> SSR fallback");

    console.log("[canonical-smoke] all public routes passed");
  } finally {
    await new Promise((resolve) => {
      try {
        mockBackend.close(() => resolve());
      } catch {
        resolve();
      }
    });
    if (!child.killed && child.exitCode === null) {
      child.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error("[canonical-smoke] failed", error);
  process.exit(1);
});
