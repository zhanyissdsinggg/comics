import { chromium } from "@playwright/test";

const BASE_URL =
  process.env.GUSH_PROD_BASE_URL ||
  process.env.READER_PROD_BASE_URL ||
  "https://www.gushcomics.com";

const EXPECTED_PRODUCTION_STORY = "The Locker Letter";
const FORBIDDEN_MIXED_TITLES = [
  "The Last Kingdom",
  "Velvet Archive",
  "Midnight Heat",
  "After Hours Letters",
];

async function assertInteractiveOnly(page, route) {
  const response = await page.goto(`${BASE_URL}${route}`, {
    waitUntil: "networkidle",
  });
  if (!response?.ok()) {
    throw new Error(`[${route}] returned ${response?.status() || "unknown"}`);
  }

  const finalUrl = page.url();
  if (route.startsWith("/search?")) {
    const parsedFinalUrl = new URL(finalUrl);
    const finalPath = parsedFinalUrl.pathname;
    const finalType = String(
      parsedFinalUrl.searchParams.get("type") || "",
    ).trim()
      .toLowerCase();
    const finalFormat = String(
      parsedFinalUrl.searchParams.get("format") || "",
    ).trim()
      .toLowerCase();
    const landedOnInteractiveRoute = finalPath === "/interactive";
    const landedOnInteractiveSearch =
      finalPath === "/search" &&
      (finalType === "interactive" || finalFormat === "interactive");

    if (!landedOnInteractiveRoute && !landedOnInteractiveSearch) {
      throw new Error(`[${route}] landed on unexpected url ${finalUrl}`);
    }
  }

  const bodyText = await page.locator("body").innerText();
  const hasPublishedStory = bodyText.includes(EXPECTED_PRODUCTION_STORY);
  const hasComingSoon =
    bodyText.includes("No live interactive stories yet") ||
    bodyText.includes("Interactive stories are coming soon") ||
    bodyText.includes("No interactive stories are published yet");

  if (!hasPublishedStory && !hasComingSoon) {
    throw new Error(
      `[${route}] expected either published story "${EXPECTED_PRODUCTION_STORY}" or a coming-soon empty state`,
    );
  }
  for (const title of FORBIDDEN_MIXED_TITLES) {
    if (bodyText.includes(title)) {
      throw new Error(`[${route}] leaked non-interactive title "${title}"`);
    }
  }
  if (bodyText.includes("All Formats")) {
    throw new Error(`[${route}] still renders All Formats on interactive-only route`);
  }
}

async function assertHomeInteractiveLink(page) {
  const response = await page.goto(BASE_URL, { waitUntil: "networkidle" });
  if (!response?.ok()) {
    throw new Error(`[home] returned ${response?.status() || "unknown"}`);
  }

  const homeBodyText = await page.locator("body").innerText();
  const lockerPublished = homeBodyText.includes(EXPECTED_PRODUCTION_STORY);
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((node) => ({
        href: node.getAttribute("href") || "",
        label: (node.textContent || "").trim(),
      }))
      .filter((item) => item.label.toLowerCase() === "interactive"),
  );

  if (!lockerPublished) {
    if (links.length > 0) {
      throw new Error("[home] interactive nav should be hidden when no published normal stories exist");
    }
    return;
  }

  if (links.length === 0) {
    throw new Error("[home] missing visible Interactive navigation link while published stories exist");
  }
  const invalid = links.filter((item) => item.href !== "/interactive");
  if (invalid.length > 0) {
    throw new Error(
      `[home] found unexpected Interactive nav hrefs: ${invalid
        .map((item) => item.href)
        .join(", ")}`,
    );
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 2000 },
    });

    await assertInteractiveOnly(page, "/search?type=interactive");
    console.log("PASS /search?type=interactive");

    await assertInteractiveOnly(page, "/search?format=interactive");
    console.log("PASS /search?format=interactive");

    await assertInteractiveOnly(page, "/interactive");
    console.log("PASS /interactive");

    await assertHomeInteractiveLink(page);
    console.log("PASS home interactive link");

    console.log(`Production interactive smoke passed against ${BASE_URL}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
