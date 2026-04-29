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
  { path: "/", expectedTitle: "Trending Comics, Novels, and Interactive Stories | Gush", expectedHeading: "Trending" },
  { path: "/comics", expectedTitle: "Comics", expectedHeading: "Comics" },
  { path: "/novels", expectedTitle: "Novels", expectedHeading: "Novels" },
  { path: "/creators", expectedTitle: "Creators", expectedHeading: "Creators" },
  { path: "/search", expectedTitle: "Search Comics & Novels", expectedHeading: "Titles" },
  { path: "/rankings", expectedTitle: "Trending Stories", expectedHeading: "Trending" },
  { path: "/series/series-001", expectedTitle: "Story", expectedHeading: "Title unavailable." },
  { path: "/store", expectedTitle: "Store", expectedHeading: "Points" },
  { path: "/subscribe", expectedTitle: "Plans", expectedHeading: "Plans" },
  { path: "/support", expectedTitle: "Support", expectedHeading: "Support" },
  { path: "/account", expectedTitle: "Account", expectedHeading: "Account" },
  { path: "/library", expectedTitle: "Library", expectedHeading: "Your library" },
  { path: "/orders", expectedTitle: "Orders", expectedHeading: "Sign in to view purchases" },
];

const BANNED_COPY = [
  "Demo Series",
  "Gush Demo Studio",
  "Creator credits are still rolling out title by title.",
  "Preview only",
  "Checkout not live.",
  "Plans are listed. Checkout is off for now.",
  "Packs are listed. Checkout is off for now.",
  "QA",
  "smoke test",
  "sparse credits",
  "internal implementation",
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
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
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
    title: extractTitle(html),
    heading: "",
  };
}

async function run() {
  if (!fs.existsSync(buildIdPath)) {
    throw new Error(`Missing production build artifact at ${buildIdPath}. Run "npm --prefix frontend run build" first.`);
  }

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const nextBin = path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next");

  if (!fs.existsSync(nextBin)) {
    throw new Error(`Unable to find Next.js CLI at ${nextBin}. Run "npm --prefix frontend install" first.`);
  }

  let stdoutLog = "";
  let stderrLog = "";
  const child = spawn(
    process.execPath,
    [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"],
    {
      cwd: frontendRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
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

      for (const phrase of BANNED_COPY) {
        if (direct.html.includes(phrase) || variant.html.includes(phrase)) {
          throw new Error(`${spec.path} still exposes banned copy: "${phrase}"`);
        }
      }

      console.log(
        `[canonical-smoke] PASS ${spec.path} -> title="${direct.title}" heading="${direct.heading}"`,
      );
    }

    console.log("[canonical-smoke] all public routes passed");
  } finally {
    if (!child.killed && child.exitCode === null) {
      child.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error("[canonical-smoke] failed", error);
  process.exit(1);
});
