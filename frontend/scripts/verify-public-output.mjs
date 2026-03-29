import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const backendRoot = path.resolve(frontendRoot, "../backend");
const CREATOR_FALLBACK_LABEL = "Creator details coming soon";
const CREATOR_FALLBACK_DETAIL = "Public creator names have not been listed on this title yet.";
const LEGACY_FORBIDDEN = [
  "Top Series",
  "Read Free",
  "Fresh pick",
  "Point packs",
  "Membership",
  "Unlock as you go",
  "4.6 stars",
  "4.7 stars",
  "4.4(742)",
  "HOT",
  "Trending",
  "Creator shelf",
  "Creator shelves",
  "Story team",
  "The team behind",
];

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

async function waitForServer(targetUrl, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let timeout = null;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        return;
      }
    } catch {
      // keep waiting
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for Next.js server");
}

function normalizeSmartPunctuation(value) {
  return String(value || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

function normalizeText(value) {
  return normalizeSmartPunctuation(
    String(value || "")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function stripTags(value) {
  return normalizeText(value);
}

function getFirstMatch(html, pattern) {
  const match = html.match(pattern);
  return match ? stripTags(match[1]) : "";
}

function includesText(haystack, needle) {
  return normalizeText(haystack).toLowerCase().includes(normalizeText(needle).toLowerCase());
}

function hasPublicCreatorCredit(series) {
  const label = String(series?.creator?.label || "").trim();
  const isFallback = Boolean(series?.creator?.isFallback);
  return Boolean(label && !isFallback && label !== CREATOR_FALLBACK_LABEL);
}

async function terminateChild(child) {
  if (!child || child.exitCode !== null || !child.pid) {
    return;
  }

  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };

    child.once("exit", finish);

    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
      });
      killer.once("exit", finish);
      killer.once("error", finish);
    } else {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode === null) {
          child.kill("SIGKILL");
        }
        finish();
      }, 2500);
    }

    setTimeout(finish, 5000);
  });
}

function buildRouteChecks(seriesCatalog) {
  const hasRealCreators = (Array.isArray(seriesCatalog) ? seriesCatalog : []).some((series) =>
    hasPublicCreatorCredit(series),
  );
  const catalogMap = new Map(
    (Array.isArray(seriesCatalog) ? seriesCatalog : []).map((series) => [String(series?.id || ""), series]),
  );

  const routes = [
    {
      route: "/",
      titleIncludes: "Read Comics and Novels Online",
      h1: "Read original comics and novels in one place.",
      required: ["Featured Series", "Browse Comics", "Browse Novels", "Meet the Creators", "Need Help?"],
      forbidden: LEGACY_FORBIDDEN,
      expectedHrefPatterns: [{ label: "series links", pattern: /href="\/series\/[^"]+"/i }],
    },
    {
      route: "/creators",
      titleIncludes: hasRealCreators ? "Creators" : "Behind the Stories",
      h1: hasRealCreators ? "Meet the Creators" : "Behind the Stories",
      required: hasRealCreators
        ? ["Featured Creators", "Start with These Stories", "Browse by Genre", "All Creators"]
        : ["Start with These Stories", "Browse by Genre", "How creator credits appear"],
      forbidden: hasRealCreators
        ? ["Story team", "The team behind"]
        : ["Story team", "The team behind", "Featured Creators"],
    },
    {
      route: "/rankings",
      titleIncludes: "Featured Series",
      h1: "Editor's picks and reader-friendly starting points.",
      required: ["Featured Series", "Browse Comics", "Browse Novels"],
      forbidden: [...LEGACY_FORBIDDEN, "Rank #", "All time", "Weekly", "Monthly"],
      expectedHrefPatterns: [{ label: "series links", pattern: /href="\/series\/[^"]+"/i }],
    },
  ];

  for (const seriesId of ["series-008", "series-012", "series-005"]) {
    const series = catalogMap.get(seriesId);
    if (!series) {
      continue;
    }

    routes.push({
      route: `/series/${seriesId}`,
      titleIncludes: String(series.title || "Series"),
      h1: String(series.title || "Series"),
      required: [hasPublicCreatorCredit(series) ? String(series?.creator?.label || "").trim() : CREATOR_FALLBACK_LABEL],
      requiredAny: [["Read Chapter 1", "Start Reading", "Continue Reading"]],
      forbidden: hasPublicCreatorCredit(series)
        ? [...LEGACY_FORBIDDEN, CREATOR_FALLBACK_LABEL, CREATOR_FALLBACK_DETAIL]
        : LEGACY_FORBIDDEN,
    });
  }

  return routes;
}

async function loadSeriesCatalog(backendBaseUrl) {
  const response = await fetch(`${backendBaseUrl}/api/series?adult=0`);
  const payload = await response.json();
  return Array.isArray(payload?.series) ? payload.series : [];
}

async function run() {
  const backendPort = await getFreePort();
  const port = await getFreePort();
  const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
  const baseUrl = `http://127.0.0.1:${port}`;
  const nextBin = path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next");
  const backendCommand = process.platform === "win32" ? "cmd.exe" : "npm";
  const backendArgs =
    process.platform === "win32"
      ? ["/c", "npm", "run", "start:prod"]
      : ["run", "start:prod"];
  const backendChild = spawn(backendCommand, backendArgs, {
    cwd: backendRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PORT: String(backendPort),
    },
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

  backendChild.stdout.on("data", (chunk) => {
    process.stdout.write(`[verify:backend] ${chunk}`);
  });
  backendChild.stderr.on("data", (chunk) => {
    process.stderr.write(`[verify:backend] ${chunk}`);
  });
  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[verify] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[verify] ${chunk}`);
  });

  try {
    await waitForServer(`${backendBaseUrl}/health`, 60000);
    await waitForServer(baseUrl);
    const seriesCatalog = await loadSeriesCatalog(backendBaseUrl);
    const routeChecks = buildRouteChecks(seriesCatalog);
    const failures = [];

    for (const item of routeChecks) {
      const res = await fetch(`${baseUrl}${item.route}`);
      const html = await res.text();
      const title = getFirstMatch(html, /<title>(.*?)<\/title>/i);
      const h1 = getFirstMatch(html, /<h1[^>]*>(.*?)<\/h1>/i);
      const h1Count = (html.match(/<h1\b/gi) || []).length;
      const mainCount = (html.match(/<main\b/gi) || []).length;
      const navCount = (html.match(/<nav\b/gi) || []).length;
      const rawImageAnchorCount = (html.match(/href="[^"]*\/_next\/image[^"]*"/gi) || []).length;
      const visibleText = normalizeText(html);
      const bodySnippet = visibleText.slice(0, 800);
      const required = (item.required || []).map((needle) => ({
        needle,
        present: includesText(visibleText, needle),
      }));
      const forbidden = (item.forbidden || []).map((needle) => ({
        needle,
        present: includesText(visibleText, needle),
      }));

      console.log(`[verify] route=${item.route}`);
      console.log(`[verify] title=${title}`);
      console.log(`[verify] h1=${h1}`);
      console.log(
        `[verify] h1Count=${h1Count} mainCount=${mainCount} navs=${navCount} rawImageAnchors=${rawImageAnchorCount}`,
      );
      console.log(`[verify] snippet=${bodySnippet}`);
      required.forEach(({ needle, present }) => {
        console.log(`[verify] contains "${needle}" -> ${present}`);
      });
      forbidden.forEach(({ needle, present }) => {
        console.log(`[verify] forbids "${needle}" -> ${!present}`);
      });

      if (!title.includes(item.titleIncludes)) {
        failures.push(`Route ${item.route} title mismatch: ${title}`);
      }
      if (h1 !== item.h1) {
        failures.push(`Route ${item.route} H1 mismatch: ${h1 || "missing"}`);
      }

      const missingRequired = required.filter((entry) => !entry.present);
      if (missingRequired.length > 0) {
        failures.push(
          `Route ${item.route} missing expected public content: ${missingRequired
            .map((entry) => entry.needle)
            .join(", ")}`,
        );
      }

      if (Array.isArray(item.requiredAny)) {
        const missingVariants = item.requiredAny.filter(
          (alternatives) => !alternatives.some((needle) => includesText(visibleText, needle)),
        );
        if (missingVariants.length > 0) {
          failures.push(
            `Route ${item.route} missing any acceptable content variant: ${missingVariants
              .map((alternatives) => alternatives.join(" | "))
              .join(", ")}`,
          );
        }
      }

      const leakedForbidden = forbidden.filter((entry) => entry.present);
      if (leakedForbidden.length > 0) {
        failures.push(
          `Route ${item.route} still exposes forbidden content: ${leakedForbidden
            .map((entry) => entry.needle)
            .join(", ")}`,
        );
      }

      if (rawImageAnchorCount > 0) {
        failures.push(`Route ${item.route} exposes raw _next/image links in public anchors`);
      }

      if (Array.isArray(item.expectedHrefPatterns)) {
        const missingHrefPatterns = item.expectedHrefPatterns.filter((entry) => !entry.pattern.test(html));
        if (missingHrefPatterns.length > 0) {
          failures.push(
            `Route ${item.route} missing expected crawlable links: ${missingHrefPatterns
              .map((entry) => entry.label)
              .join(", ")}`,
          );
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(failures.join("\n"));
    }

    console.log("[verify] public output checks passed");
  } finally {
    await terminateChild(backendChild);
    await terminateChild(child);
  }
}

run().catch((error) => {
  console.error("[verify] failed", error);
  process.exit(1);
});
