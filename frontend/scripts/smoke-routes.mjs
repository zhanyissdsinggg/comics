import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CRITICAL_ROUTES } from "./critical-routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const buildIdPath = path.join(frontendRoot, ".next", "BUILD_ID");

const ROUTES = CRITICAL_ROUTES;
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
];

const SERIES_EPISODES = {
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

function jsonResponse(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function buildSeriesPayload(seriesId) {
  const series = CATALOG.find((item) => item.id === seriesId);
  if (!series) {
    return null;
  }

  return {
    series,
    episodes: SERIES_EPISODES[seriesId] || [],
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
      const payload = buildSeriesPayload(seriesId);
      const episode =
        (payload?.episodes || []).find((item) => item.id === episodeId) || null;
      if (!payload || !episode) {
        jsonResponse(response, 404, { error: "NOT_FOUND" });
        return;
      }
      jsonResponse(response, 200, { episode });
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
      const { port } = address;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

async function waitForServer(baseUrl, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/`);
      if (res.ok) {
        return;
      }
    } catch {
      // keep waiting
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Timed out waiting for Next.js server");
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
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: frontendRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "production",
      API_BASE_URL: backendBaseUrl,
      NEXT_PUBLIC_API_BASE_URL: backendBaseUrl,
    },
  });

  child.stdout.on("data", (chunk) => {
    stdoutLog += chunk.toString();
    process.stdout.write(`[smoke] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    stderrLog += chunk.toString();
    process.stderr.write(`[smoke] ${chunk}`);
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

    for (const route of ROUTES) {
      const res = await fetch(`${baseUrl}${route}`);
      if (!res.ok) {
        throw new Error(`Route ${route} returned ${res.status}`);
      }
      const html = await res.text();
      if (!html.includes("<html")) {
        throw new Error(`Route ${route} did not return HTML`);
      }
      console.log(`[smoke] ${route} -> ${res.status}`);
    }

    console.log("[smoke] all routes passed");
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
  console.error("[smoke] failed", error);
  process.exit(1);
});
