import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");

const ROUTES = [
  {
    route: "/",
    expectedTitle: "Read Comics and Novels Online",
    expectedH1: "Read comics and novels, start free, and unlock more when you're ready.",
    expectedNeedles: ["Trending now", "New updates", "How Gush works"],
  },
  {
    route: "/comics",
    expectedTitle: "Comics",
    expectedH1: "Browse comics with faster first clicks.",
    expectedNeedles: ["Free first chapters", "Popular comics", "Quick genre picks"],
  },
  {
    route: "/novels",
    expectedTitle: "Novels",
    expectedH1: "Browse novels with room to settle in.",
    expectedNeedles: ["Fresh drops", "Popular novels", "Quick genre picks"],
  },
  {
    route: "/creators",
    expectedTitle: "Creators & Studios",
    expectedH1: "Find the creators worth following.",
    expectedNeedles: ["Search by creator, studio, or genre.", "Creator spotlight", "Browse every visible creator page."],
  },
  {
    route: "/rankings",
    expectedTitle: "Top Series",
    expectedH1: "See what readers are opening right now.",
    expectedNeedles: ["Choose a Top Series view.", "Rank #1", "Top Series creators"],
  },
  {
    route: "/store",
    expectedTitle: "Store",
    expectedH1: "Buy points for one-time unlocks.",
    expectedNeedles: ["How paying works", "Point packs", "Billing accountability"],
  },
  {
    route: "/subscribe",
    expectedTitle: "Membership",
    expectedH1: "Pick the plan that fits your reading rhythm.",
    expectedNeedles: ["Recurring monthly billing", "Three tiers. Three reading habits.", "Membership accountability"],
  },
  {
    route: "/orders",
    expectedTitle: "Purchases",
    expectedH1: "Purchases live on your account.",
    expectedNeedles: ["Sign in to view your purchases", "See point packs", "Support"],
  },
  {
    route: "/account",
    expectedTitle: "Account",
    expectedH1: "Your account, purchases, and reading setup.",
    expectedNeedles: ["Sign in to keep purchases, library, and mature-content settings on one account.", "Browse series", "Store"],
  },
  {
    route: "/series/demo-series",
    expectedTitle: "Series",
    expectedH1: "We're pulling the full series page now.",
    expectedNeedles: ["Loading title", "Browse Top Series", "See point packs"],
  },
  {
    route: "/read/demo-series/demo-episode",
    expectedTitle: "Gush | Read comics and novels",
    expectedH1: "Getting the reader ready.",
    expectedNeedles: ["Opening chapter", "Back to series", "Need help instead?"],
  },
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
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for Next.js server");
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

function stripTags(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function getFirstMatch(html, pattern) {
  const match = html.match(pattern);
  return match ? stripTags(match[1]) : "";
}

function countNeedleMatches(html, needle) {
  const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return (html.match(pattern) || []).length;
}

async function run() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const nextBin = path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: frontendRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[verify] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[verify] ${chunk}`);
  });

  try {
    await waitForServer(baseUrl);
    const failures = [];

    for (const item of ROUTES) {
      const res = await fetch(`${baseUrl}${item.route}`);
      const html = await res.text();
      const title = getFirstMatch(html, /<title>(.*?)<\/title>/i);
      const h1 = getFirstMatch(html, /<h1[^>]*>(.*?)<\/h1>/i);
      const h1Count = (html.match(/<h1\b/gi) || []).length;
      const mainCount = (html.match(/<main\b/gi) || []).length;
      const navCount = (html.match(/<nav\b/gi) || []).length;
      const duplicateHomeLinks = countNeedleMatches(html, ">Home<");
      const duplicateSupportLinks = countNeedleMatches(html, ">Support<");
      const bodySnippet = stripTags(html).slice(0, 800);
      const needles = item.expectedNeedles.map((needle) => ({
        needle,
        present: html.includes(needle),
      }));

      console.log(`[verify] route=${item.route}`);
      console.log(`[verify] title=${title}`);
      console.log(`[verify] h1=${h1}`);
      console.log(`[verify] h1Count=${h1Count} mainCount=${mainCount} navs=${navCount} homeLinks=${duplicateHomeLinks} supportLinks=${duplicateSupportLinks}`);
      console.log(`[verify] snippet=${bodySnippet}`);
      needles.forEach(({ needle, present }) => {
        console.log(`[verify] contains "${needle}" -> ${present}`);
      });

      if (!title.includes(item.expectedTitle)) {
        failures.push(`Route ${item.route} title mismatch: ${title}`);
      }
      if (h1 !== item.expectedH1) {
        failures.push(`Route ${item.route} H1 mismatch: ${h1 || "missing"}`);
      }
      const missing = needles.filter((entry) => !entry.present);
      if (missing.length > 0) {
        failures.push(
          `Route ${item.route} missing expected public content: ${missing.map((entry) => entry.needle).join(", ")}`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(failures.join("\n"));
    }

    console.log("[verify] public output checks passed");
  } finally {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error("[verify] failed", error);
  process.exit(1);
});
