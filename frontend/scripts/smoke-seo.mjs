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
const seoSmokeDistDir = ".next-seo-smoke";
const seoSmokeBuildIdPath = path.join(frontendRoot, seoSmokeDistDir, "BUILD_ID");

const NORMAL_SERIES = {
  id: "series-001",
  title: "The Last Kingdom",
  author: "Mira Dane",
  type: "comic",
  status: "Ongoing",
  adult: false,
  description: "A rogue prince fights to keep one last city from falling.",
  shortDescription: "A rogue prince fights to keep one last city from falling.",
  synopsis: "A rogue prince fights to keep one last city from falling.",
  coverUrl: "/mock-covers/series-001.jpg",
  bannerUrl: "/mock-covers/series-001.jpg",
  genres: ["Fantasy", "Action"],
  episodeCount: 2,
  latestEpisodeId: "series-001e2",
  updatedAt: "2026-05-01T12:00:00.000Z",
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
};

const ADULT_SERIES = {
  id: "series-013",
  title: "After Hours",
  author: "Iris Vale",
  type: "comic",
  status: "Ongoing",
  adult: true,
  description: "A restrained late-night workplace drama for adults only.",
  shortDescription: "A restrained late-night workplace drama for adults only.",
  synopsis: "A restrained late-night workplace drama for adults only.",
  coverUrl: "/mock-covers/series-013.jpg",
  bannerUrl: "/mock-covers/series-013.jpg",
  genres: ["Mature", "Drama", "Romance"],
  episodeCount: 1,
  latestEpisodeId: "series-013e1",
  updatedAt: "2026-05-02T12:00:00.000Z",
  creator: {
    label: "Iris Vale",
    type: "person",
    slug: "iris-vale-a13b29",
    creatorId: "creator_iris_vale",
    isFallback: false,
  },
  creatorCredits: [
    {
      creatorId: "creator_iris_vale",
      slug: "iris-vale-a13b29",
      name: "Iris Vale",
      type: "person",
      role: "writer",
      isPrimary: true,
      sortOrder: 0,
    },
  ],
};

const SERIES_CATALOG = [NORMAL_SERIES, ADULT_SERIES];

const SERIES_EPISODES = {
  "series-001": [
    {
      id: "series-001e1",
      seriesId: "series-001",
      number: 1,
      title: "Chapter 1",
      type: "comic",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-01T00:00:00.000Z",
      pages: [
        { url: "/mock-pages/series-001e1-p1.jpg", w: 800, h: 1200 },
      ],
      paragraphs: [],
    },
    {
      id: "series-001e2",
      seriesId: "series-001",
      number: 2,
      title: "Chapter 2",
      type: "comic",
      pricePts: 5,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-08T00:00:00.000Z",
      pages: [
        { url: "/mock-pages/series-001e2-p1.jpg", w: 800, h: 1200 },
      ],
      paragraphs: [],
    },
  ],
  "series-013": [
    {
      id: "series-013e1",
      seriesId: "series-013",
      number: 1,
      title: "Episode 1",
      type: "comic",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-03T00:00:00.000Z",
      pages: [
        { url: "/mock-pages/series-013e1-p1.jpg", w: 800, h: 1200 },
      ],
      paragraphs: [],
    },
  ],
};

function jsonResponse(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function getSeriesById(seriesId) {
  return SERIES_CATALOG.find((series) => series.id === seriesId) || null;
}

function getSeriesEpisodes(seriesId) {
  return SERIES_EPISODES[seriesId] || [];
}

function buildSeriesPayload(seriesId) {
  const series = getSeriesById(seriesId);
  if (!series) {
    return null;
  }

  return {
    series,
    episodes: getSeriesEpisodes(seriesId),
  };
}

function createMockBackendServer() {
  return http.createServer((request, response) => {
    if (!request.url) {
      jsonResponse(response, 404, { error: "NOT_FOUND" });
      return;
    }

    const url = new URL(request.url, "http://127.0.0.1");
    const { pathname } = url;
    const adultFlag = url.searchParams.get("adult") === "1";

    if (pathname === "/api/series") {
      jsonResponse(response, 200, {
        series: adultFlag
          ? [ADULT_SERIES, NORMAL_SERIES]
          : [NORMAL_SERIES, ADULT_SERIES],
      });
      return;
    }

    if (pathname.startsWith("/api/series/")) {
      const seriesId = pathname.split("/").pop() || "";
      const payload = buildSeriesPayload(seriesId);
      if (!payload) {
        jsonResponse(response, 404, { error: "NOT_FOUND" });
        return;
      }

      if (payload.series.adult && !adultFlag) {
        jsonResponse(
          response,
          403,
          { error: "ADULT_GATED", reason: "NEED_AGE_CONFIRM" },
        );
        return;
      }

      jsonResponse(response, 200, payload);
      return;
    }

    if (pathname === "/api/episode") {
      const seriesId = url.searchParams.get("seriesId") || "";
      const episodeId = url.searchParams.get("episodeId") || "";
      const episode =
        getSeriesEpisodes(seriesId).find((item) => item.id === episodeId) || null;
      if (!episode) {
        jsonResponse(response, 404, { error: "NOT_FOUND" });
        return;
      }

      jsonResponse(response, 200, { episode });
      return;
    }

    if (pathname === "/api/search") {
      const query = String(url.searchParams.get("q") || "")
        .trim()
        .toLowerCase();
      const results = (adultFlag ? [ADULT_SERIES, NORMAL_SERIES] : [NORMAL_SERIES, ADULT_SERIES])
        .filter((series) =>
          query ? series.title.toLowerCase().includes(query) : true,
        );
      jsonResponse(response, 200, {
        results,
        total: results.length,
        page: 1,
        pageSize: 48,
      });
      return;
    }

    if (pathname === "/api/search/hot") {
      jsonResponse(response, 200, {
        keywords: adultFlag
          ? ["after hours", "mature romance"]
          : ["kingdom", "fantasy"],
      });
      return;
    }

    if (pathname === "/api/rankings") {
      jsonResponse(response, 200, {
        rankings: adultFlag
          ? [ADULT_SERIES, NORMAL_SERIES]
          : [NORMAL_SERIES, ADULT_SERIES],
      });
      return;
    }

    if (pathname === "/api/recommendations/homepage") {
      jsonResponse(response, 200, {
        slots: [
          {
            id: adultFlag ? "adult-hero" : "normal-hero",
            slot: "home-hero",
            seriesIds: [adultFlag ? ADULT_SERIES.id : NORMAL_SERIES.id],
          },
          {
            id: adultFlag ? "adult-breakout" : "normal-breakout",
            slot: "home-breakout",
            seriesIds: [adultFlag ? ADULT_SERIES.id : NORMAL_SERIES.id],
          },
        ],
      });
      return;
    }

    if (pathname === "/api/billing/topups") {
      jsonResponse(response, 200, {
        packages: [],
        billing: {
          purchaseActionsEnabled: true,
        },
      });
      return;
    }

    if (pathname === "/api/billing/plans") {
      jsonResponse(response, 200, {
        plans: [],
        billing: {
          purchaseActionsEnabled: true,
        },
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMetaByName(html, name) {
  const escapedName = escapeRegExp(name);
  const patterns = [
    new RegExp(
      `<meta[^>]*name=["']${escapedName}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${escapedName}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const matches = Array.from(html.matchAll(new RegExp(pattern.source, "gi")));
    const lastMatch = matches.at(-1);
    if (lastMatch?.[1]) {
      return lastMatch[1];
    }
  }

  return "";
}

function extractMetaByProperty(html, property) {
  const escapedProperty = escapeRegExp(property);
  const patterns = [
    new RegExp(
      `<meta[^>]*property=["']${escapedProperty}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${escapedProperty}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const matches = Array.from(html.matchAll(new RegExp(pattern.source, "gi")));
    const lastMatch = matches.at(-1);
    if (lastMatch?.[1]) {
      return lastMatch[1];
    }
  }

  return "";
}

function extractCanonical(html) {
  const patterns = [
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

function extractTitle(html) {
  const match = String(html || "").match(/<title>([\s\S]*?)<\/title>/i);
  return String(match?.[1] || "").trim();
}

function normalizeRobotsContent(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function toResolvedUrl(value, fallbackBase = "https://www.gushcomics.com") {
  try {
    return new URL(String(value || ""), fallbackBase);
  } catch {
    return null;
  }
}

function extractCanonicalPath(html) {
  const canonical = extractCanonical(html);
  const url = toResolvedUrl(canonical);
  return {
    href: canonical,
    pathname: url?.pathname || "",
    search: url?.search || "",
  };
}

function extractSitemapPaths(xml) {
  return Array.from(
    xml.matchAll(/<loc>([^<]+)<\/loc>/gi),
    (match) => toResolvedUrl(match[1])?.pathname || "",
  ).filter(Boolean);
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectContains(haystack, needle, message) {
  expect(String(haystack).includes(needle), message);
}

function expectNotContains(haystack, needle, message) {
  expect(!String(haystack).includes(needle), message);
}

async function fetchText(baseUrl, pathname, { cookieHeader = "" } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: cookieHeader
      ? {
          Cookie: cookieHeader,
        }
      : undefined,
  });

  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}`);
  }

  return await response.text();
}

async function run() {
  const port = await getFreePort();
  const backendPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
  const nextBin = path.join(
    frontendRoot,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );

  if (!fs.existsSync(nextBin)) {
    throw new Error(
      `Unable to find Next.js CLI at ${nextBin}. Run "npm install" first.`,
    );
  }

  let stdoutLog = "";
  let stderrLog = "";
  let buildStdoutLog = "";
  let buildStderrLog = "";

  const mockBackend = createMockBackendServer();
  await new Promise((resolve, reject) => {
    mockBackend.once("error", reject);
    mockBackend.listen(backendPort, "127.0.0.1", () => resolve());
  });

  if (fs.existsSync(path.join(frontendRoot, seoSmokeDistDir))) {
    fs.rmSync(path.join(frontendRoot, seoSmokeDistDir), {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 200,
    });
  }

  const buildChild = spawn(
    process.execPath,
    [nextBin, "build"],
    {
      cwd: frontendRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXT_DIST_DIR: seoSmokeDistDir,
        API_BASE_URL: backendBaseUrl,
        NEXT_PUBLIC_API_BASE_URL: backendBaseUrl,
        NEXT_PUBLIC_BASE_URL: baseUrl,
        NEXT_PUBLIC_SITE_URL: baseUrl,
        NEXT_PUBLIC_ENABLE_CHECKOUT: "1",
        NEXT_PUBLIC_ENABLE_POINT_PACKS: "1",
      },
    },
  );

  buildChild.stdout.on("data", (chunk) => {
    buildStdoutLog += chunk.toString();
  });

  buildChild.stderr.on("data", (chunk) => {
    buildStderrLog += chunk.toString();
  });

  await new Promise((resolve, reject) => {
    buildChild.once("error", (error) => {
      reject(new Error(`Failed to build Next.js SEO smoke bundle: ${error.message}`));
    });
    buildChild.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          [
            `Next.js SEO smoke build failed (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
            buildStdoutLog ? `stdout:\n${buildStdoutLog.trim()}` : "",
            buildStderrLog ? `stderr:\n${buildStderrLog.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        ),
      );
    });
  });

  if (!fs.existsSync(seoSmokeBuildIdPath)) {
    throw new Error(
      `Missing SEO smoke build artifact at ${seoSmokeBuildIdPath}.`,
    );
  }

  const child = spawn(
    process.execPath,
    [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"],
    {
      cwd: frontendRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXT_DIST_DIR: seoSmokeDistDir,
        API_BASE_URL: backendBaseUrl,
        NEXT_PUBLIC_API_BASE_URL: backendBaseUrl,
        NEXT_PUBLIC_BASE_URL: baseUrl,
        NEXT_PUBLIC_SITE_URL: baseUrl,
        NEXT_PUBLIC_ENABLE_CHECKOUT: "1",
        NEXT_PUBLIC_ENABLE_POINT_PACKS: "1",
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
      reject(new Error(`Failed to start Next.js SEO smoke server: ${error.message}`));
    });
    child.once("exit", (code, signal) => {
      reject(
        new Error(
          [
            `Next.js SEO smoke server exited before checks completed (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
            stdoutLog ? `stdout:\n${stdoutLog.trim()}` : "",
            stderrLog ? `stderr:\n${stderrLog.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        ),
      );
    });
  });

  const adultCookies = "mn_is_signed_in=1; mn_adult_confirmed=1; mn_adult_mode=1";

  try {
    await Promise.race([waitForServer(baseUrl), childExit]);

    const sitemapXml = await fetchText(baseUrl, "/sitemap.xml");
    const sitemapPaths = extractSitemapPaths(sitemapXml);
    expectContains(
      sitemapPaths,
      "/series/series-001",
      "Sitemap should include the public normal series detail route.",
    );
    expectContains(
      sitemapPaths,
      "/comics",
      "Sitemap should include /comics.",
    );
    expectContains(
      sitemapPaths,
      "/novels",
      "Sitemap should include /novels.",
    );
    expectContains(
      sitemapPaths,
      "/rankings",
      "Sitemap should include /rankings.",
    );
    expectContains(
      sitemapPaths,
      "/creators",
      "Sitemap should include /creators.",
    );
    expectContains(
      sitemapPaths,
      "/support",
      "Sitemap should include /support.",
    );
    expectContains(
      sitemapPaths,
      "/privacy-policy",
      "Sitemap should include /privacy-policy.",
    );
    expectContains(
      sitemapPaths,
      "/terms-of-service",
      "Sitemap should include /terms-of-service.",
    );
    expectNotContains(
      sitemapPaths,
      "/series/series-013",
      "Sitemap must not include adult series detail routes.",
    );
    expectNotContains(
      sitemapPaths,
      "/adult-gate",
      "Sitemap must not include /adult-gate.",
    );
    expectNotContains(
      sitemapPaths,
      "/mature-content",
      "Sitemap must not include /mature-content.",
    );
    expectNotContains(
      sitemapPaths,
      "/adult",
      "Sitemap must not include /adult routes.",
    );
    expectNotContains(
      sitemapPaths,
      "/search",
      "Sitemap must not include search pages.",
    );
    expectNotContains(
      sitemapPaths,
      "/read/",
      "Sitemap must not include reader routes.",
    );
    if (sitemapPaths.includes("/store")) {
      console.log("[seo-smoke] PASS sitemap includes /store while public commerce is enabled");
    } else {
      console.log("[seo-smoke] PASS sitemap omits /store while commerce remains prelaunch or private");
    }
    console.log("[seo-smoke] PASS sitemap includes only public normal routes");

    const robotsTxt = await fetchText(baseUrl, "/robots.txt");
    expectContains(
      robotsTxt,
      "Disallow: /adult",
      "robots.txt should disallow /adult.",
    );
    expectContains(
      robotsTxt,
      "Disallow: /adult-gate",
      "robots.txt should disallow /adult-gate.",
    );
    expectContains(
      robotsTxt,
      "Disallow: /mature-content",
      "robots.txt should disallow /mature-content.",
    );
    expectNotContains(
      robotsTxt,
      "Disallow: /series",
      "robots.txt must not block normal series detail routes.",
    );
    expectNotContains(
      robotsTxt,
      "Disallow: /comics",
      "robots.txt must not block /comics.",
    );
    expectNotContains(
      robotsTxt,
      "Disallow: /novels",
      "robots.txt must not block /novels.",
    );
    expectNotContains(
      robotsTxt,
      "Disallow: /rankings",
      "robots.txt must not block /rankings.",
    );
    expectContains(
      robotsTxt,
      "sitemap.xml",
      "robots.txt should advertise sitemap.xml.",
    );
    console.log("[seo-smoke] PASS robots.txt keeps adult paths blocked and public paths crawlable");

    const normalSeriesHtml = await fetchText(
      baseUrl,
      "/series/series-001?utm_source=seo-smoke",
    );
    const normalSeriesTitle = extractTitle(normalSeriesHtml);
    const normalSeriesDescription = extractMetaByName(normalSeriesHtml, "description");
    const normalSeriesRobots = normalizeRobotsContent(
      extractMetaByName(normalSeriesHtml, "robots"),
    );
    const normalSeriesCanonical = extractCanonicalPath(normalSeriesHtml);
    expectContains(
      normalSeriesRobots,
      "index",
      "Normal series should remain indexable.",
    );
    expectContains(
      normalSeriesRobots,
      "follow",
      "Normal series should remain followable.",
    );
    expect(
      normalSeriesCanonical.pathname === "/series/series-001" &&
        normalSeriesCanonical.search === "",
      "Normal series canonical should drop query parameters.",
    );
    expectContains(
      normalSeriesTitle,
      "The Last Kingdom",
      "Normal series should publish a stable title tag.",
    );
    expect(
      Boolean(String(normalSeriesDescription || "").trim()),
      "Normal series should publish a meta description.",
    );
    expect(
      Boolean(extractMetaByProperty(normalSeriesHtml, "og:title")),
      "Normal series should publish og:title metadata.",
    );
    expect(
      Boolean(extractMetaByProperty(normalSeriesHtml, "og:description")),
      "Normal series should publish og:description metadata.",
    );
    expect(
      Boolean(extractMetaByProperty(normalSeriesHtml, "og:image")),
      "Normal series should publish og:image metadata.",
    );
    expect(
      Boolean(extractMetaByName(normalSeriesHtml, "twitter:card")),
      "Normal series should publish twitter card metadata.",
    );
    console.log("[seo-smoke] PASS normal series metadata stays indexable with clean canonical");

    const adultCatalogHtml = await fetchText(baseUrl, "/adult", {
      cookieHeader: adultCookies,
    });
    const adultCatalogRobots = normalizeRobotsContent(
      extractMetaByName(adultCatalogHtml, "robots"),
    );
    const adultCatalogCanonical = extractCanonicalPath(adultCatalogHtml);
    expect(
      adultCatalogRobots === "noindex,nofollow",
      `Adult catalog route should be noindex,nofollow, got "${adultCatalogRobots}".`,
    );
    expect(
      adultCatalogCanonical.pathname === "/adult" &&
        adultCatalogCanonical.search === "",
      "Adult catalog canonical should stay stable.",
    );
    console.log("[seo-smoke] PASS adult catalog route is blocked from indexing");

    const adultSeriesHtml = await fetchText(baseUrl, "/series/series-013", {
      cookieHeader: adultCookies,
    });
    const adultSeriesRobots = normalizeRobotsContent(
      extractMetaByName(adultSeriesHtml, "robots"),
    );
    const adultSeriesCanonical = extractCanonicalPath(adultSeriesHtml);
    expect(
      adultSeriesRobots === "noindex,nofollow",
      `Adult series should be noindex,nofollow, got "${adultSeriesRobots}".`,
    );
    expect(
      adultSeriesCanonical.pathname === "/series/series-013" &&
        adultSeriesCanonical.search === "",
      "Adult series canonical should stay stable.",
    );
    expectNotContains(
      adultSeriesHtml,
      'id="series-jsonld-series-013"',
      "Adult series should not emit series JSON-LD.",
    );
    console.log("[seo-smoke] PASS adult series metadata is noindex and omits structured data");

    const searchHtml = await fetchText(
      baseUrl,
      "/search?q=kingdom&utm_source=seo-smoke",
    );
    const searchRobots = normalizeRobotsContent(
      extractMetaByName(searchHtml, "robots"),
    );
    const searchCanonical = extractCanonicalPath(searchHtml);
    expect(
      searchRobots === "noindex,follow",
      `Search pages should be noindex,follow, got "${searchRobots}".`,
    );
    expect(
      searchCanonical.pathname === "/search" && searchCanonical.search === "",
      "Search canonical should drop query parameters.",
    );
    console.log("[seo-smoke] PASS search metadata is noindex with a clean canonical");

    const freeReaderHtml = await fetchText(
      baseUrl,
      "/read/series-001/series-001e1?campaignId=seo-smoke",
    );
    const freeReaderRobots = normalizeRobotsContent(
      extractMetaByName(freeReaderHtml, "robots"),
    );
    const freeReaderCanonical = extractCanonicalPath(freeReaderHtml);
    expect(
      freeReaderRobots === "index,follow",
      `Free normal reader should be index,follow, got "${freeReaderRobots}".`,
    );
    expect(
      freeReaderCanonical.pathname === "/read/series-001/series-001e1" &&
        freeReaderCanonical.search === "",
      "Free reader canonical should drop query parameters.",
    );
    console.log("[seo-smoke] PASS free normal reader metadata is indexable");

    const paidReaderHtml = await fetchText(baseUrl, "/read/series-001/series-001e2");
    const paidReaderRobots = normalizeRobotsContent(
      extractMetaByName(paidReaderHtml, "robots"),
    );
    expect(
      paidReaderRobots === "noindex,follow",
      `Paid normal reader should be noindex,follow, got "${paidReaderRobots}".`,
    );
    console.log("[seo-smoke] PASS paid normal reader metadata is noindex");

    const adultReaderHtml = await fetchText(baseUrl, "/read/series-013/series-013e1", {
      cookieHeader: adultCookies,
    });
    const adultReaderRobots = normalizeRobotsContent(
      extractMetaByName(adultReaderHtml, "robots"),
    );
    const adultReaderCanonical = extractCanonicalPath(adultReaderHtml);
    expect(
      adultReaderRobots === "noindex,nofollow",
      `Adult reader should be noindex,nofollow, got "${adultReaderRobots}".`,
    );
    expect(
      adultReaderCanonical.pathname === "/read/series-013/series-013e1" &&
        adultReaderCanonical.search === "",
      "Adult reader canonical should stay stable.",
    );
    console.log("[seo-smoke] PASS adult reader metadata is blocked from indexing");

    const adultHomeHtml = await fetchText(baseUrl, "/", {
      cookieHeader: adultCookies,
    });
    const adultHomeRobots = normalizeRobotsContent(
      extractMetaByName(adultHomeHtml, "robots"),
    );
    expect(
      adultHomeRobots === "noindex,nofollow",
      `Adult-mode homepage should be noindex,nofollow, got "${adultHomeRobots}".`,
    );
    console.log("[seo-smoke] PASS adult-mode homepage is noindex");

    console.log("[seo-smoke] all SEO checks passed");
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

    if (fs.existsSync(path.join(frontendRoot, seoSmokeDistDir))) {
      fs.rmSync(path.join(frontendRoot, seoSmokeDistDir), {
        recursive: true,
        force: true,
        maxRetries: 8,
        retryDelay: 200,
      });
    }
  }
}

run().catch((error) => {
  console.error("[seo-smoke] failed", error);
  process.exit(1);
});
