import process from "node:process";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const requireFromFrontend = createRequire(path.resolve(ROOT, "frontend/package.json"));
const { chromium } = requireFromFrontend("@playwright/test");

const DEFAULT_FRONTEND_URL = "https://www.gushcomics.com";
const DEFAULT_TIMEOUT_MS = 20_000;

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return DEFAULT_FRONTEND_URL;
  }
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function readEnv(name, fallback) {
  const value = String(process.env[name] || "").trim();
  return value || fallback;
}

async function main() {
  // This smoke test is a UI contract check, so it must always target the frontend base URL.
  // Avoid falling back to BACKEND_URL because that may point at an API domain.
  const baseUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  const seriesId = readEnv("OPS_SMOKE_SERIES_ID", "series-001");
  const episodeId = readEnv("OPS_SMOKE_EPISODE_ID", "series-001e1");
  const targetUrl = `${baseUrl}/read/${seriesId}/${episodeId}`;

  console.log(`[ops-reader] url=${targetUrl}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (err) => {
    errors.push(err);
    console.error(`[ops-reader] pageerror: ${err?.stack || String(err)}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error(`[ops-reader] console.error: ${msg.text()}`);
    }
  });
  page.on("requestfailed", (req) => {
    const failure = req.failure();
    const url = req.url();
    if (url.includes("/_next/static/")) {
      console.warn(
        `[ops-reader] requestfailed: ${req.method()} ${url} :: ${failure?.errorText || "unknown"}`,
      );
    }
  });

  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 60_000 });

  // Ensure the reader did not fall back into the "didn't load" card.
  const errorCard = page.getByText("This episode didn't load.", { exact: true });
  if (await errorCard.isVisible().catch(() => false)) {
    throw new Error("reader rendered episode load failure card");
  }

  const chapters = page.getByRole("button", { name: "Chapters" });
  await chapters.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
  await chapters.click({ timeout: DEFAULT_TIMEOUT_MS });

  const drawer = page.locator('[aria-label="Reader contents"]');
  await drawer.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });

  // Close and ensure it hides to validate both open + close transitions.
  const close = drawer.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) {
    await close.click({ timeout: DEFAULT_TIMEOUT_MS });
    await drawer.waitFor({ state: "hidden", timeout: DEFAULT_TIMEOUT_MS });
  }

  if (errors.length > 0) {
    throw new Error(`reader smoke observed ${errors.length} page error(s)`);
  }

  await context.close();
  await browser.close();

  console.log("[ops-reader] pass");
}

main().catch((error) => {
  console.error(`[ops-reader] fail: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
