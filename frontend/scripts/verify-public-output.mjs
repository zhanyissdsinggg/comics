import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const backendRoot = path.resolve(frontendRoot, "../backend");

const ROUTES = [
  {
    route: "/",
    expectedTitle: "Read Comics and Novels Online",
    expectedH1: "Read comics and novels, start free, and unlock more when you're ready.",
    expectedNeedles: ["New updates", "How Gush works", "Leave the homepage with a cleaner next click."],
    expectedHrefPatterns: [{ label: "series links", pattern: /href="\/series\/[^"]+"/i }],
  },
  {
    route: "/comics",
    expectedTitle: "Comics",
    expectedH1: "Browse comics with faster first clicks.",
    expectedNeedles: ["Free first chapters", "Popular comics", "Quick genre picks"],
    expectedHrefPatterns: [{ label: "series links", pattern: /href="\/series\/[^"]+"/i }],
  },
  {
    route: "/novels",
    expectedTitle: "Novels",
    expectedH1: "Browse novels with room to settle in.",
    expectedNeedles: ["Fresh drops", "Popular novels", "Quick genre picks"],
    expectedHrefPatterns: [{ label: "series links", pattern: /href="\/series\/[^"]+"/i }],
  },
  {
    route: "/creators",
    expectedTitle: "Creators & Studios",
    expectedH1: "Find the creators worth following.",
    expectedNeedles: [
      "Search by creator, studio, or genre.",
      "Creator spotlight",
      "Use live titles until creator credits catch up.",
    ],
  },
  {
    route: "/rankings",
    expectedTitle: "Top Series",
    expectedH1: "See what readers are opening right now.",
    expectedNeedles: ["Choose a Top Series view.", "Rank #1", "Search titles"],
    expectedHrefPatterns: [{ label: "series links", pattern: /href="\/series\/[^"]+"/i }],
  },
  {
    route: "/store",
    expectedTitle: "Store",
    expectedH1: "Buy points for one-time unlocks.",
    expectedNeedles: ["How paying works", "Point packs", "Point packs are one-time. Membership is the monthly path."],
  },
  {
    route: "/subscribe",
    expectedTitle: "Membership",
    expectedH1: "Pick the plan that fits your reading rhythm.",
    expectedNeedles: ["Recurring monthly billing", "Three tiers. Three reading habits.", "Membership is monthly. Point packs stay flexible. Help should stay obvious."],
  },
  {
    route: "/orders",
    expectedTitle: "Purchases",
    expectedH1: "Sign in, compare plans, or get billing help.",
    expectedNeedles: ["See point packs", "Compare membership", "Get billing help"],
  },
  {
    route: "/account",
    expectedTitle: "Account",
    expectedH1: "Sign in for receipts and recovery. Keep local reading setup here now.",
    expectedNeedles: ["Sign in to keep purchases, library, and mature-content settings on one account.", "Reset password", "Works on this device right now"],
  },
  {
    route: "/how-it-works",
    expectedTitle: "How Gush Works",
    expectedH1: "How Gush works before you spend anything.",
    expectedNeedles: ["Pricing basics", "Billing and receipts", "Quick answers"],
  },
  {
    route: "/support",
    expectedTitle: "Support",
    expectedH1: "Billing, account, and reader help.",
    expectedNeedles: ["Fast issue shortcuts", "Use this topic", "How it works"],
  },
  {
    route: "/series/demo-series",
    expectedTitle: "Series",
    expectedH1: "This title is not available in the public catalog.",
    expectedNeedles: ["Series unavailable", "Browse Top Series", "Search titles"],
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
      const rawImageAnchorCount = (html.match(/href="[^"]*\/_next\/image[^"]*"/gi) || []).length;
      const bodySnippet = stripTags(html).slice(0, 800);
      const needles = item.expectedNeedles.map((needle) => ({
        needle,
        present: html.includes(needle),
      }));

      console.log(`[verify] route=${item.route}`);
      console.log(`[verify] title=${title}`);
      console.log(`[verify] h1=${h1}`);
      console.log(`[verify] h1Count=${h1Count} mainCount=${mainCount} navs=${navCount} homeLinks=${duplicateHomeLinks} supportLinks=${duplicateSupportLinks} rawImageAnchors=${rawImageAnchorCount}`);
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
      if (rawImageAnchorCount > 0) {
        failures.push(`Route ${item.route} exposes raw _next/image links in public anchors`);
      }
      if (Array.isArray(item.expectedHrefPatterns)) {
        const missingHrefPatterns = item.expectedHrefPatterns.filter((entry) => !entry.pattern.test(html));
        if (missingHrefPatterns.length > 0) {
          failures.push(
            `Route ${item.route} missing expected crawlable links: ${missingHrefPatterns.map((entry) => entry.label).join(", ")}`,
          );
        }
      }
      if (item.route === "/") {
        const footerIndex = html.lastIndexOf("<footer");
        const topNowIndex = html.indexOf("Top now");
        const freeStartRailIndex = Math.max(html.indexOf("Easy first clicks"), html.indexOf("Free start"));

        if (footerIndex === -1) {
          failures.push("Route / missing footer markup");
        }
        if (topNowIndex === -1 || (footerIndex !== -1 && topNowIndex > footerIndex)) {
          failures.push('Route / renders "Top now" after the footer');
        }
        if (freeStartRailIndex === -1 || (footerIndex !== -1 && freeStartRailIndex > footerIndex)) {
          failures.push('Route / renders the free-start rail after the footer');
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(failures.join("\n"));
    }

    console.log("[verify] public output checks passed");
  } finally {
    if (!backendChild.killed) {
      backendChild.kill("SIGTERM");
    }
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error("[verify] failed", error);
  process.exit(1);
});
