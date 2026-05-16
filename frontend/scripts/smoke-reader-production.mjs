import { chromium } from "@playwright/test";

const BASE_URL = process.env.READER_PROD_BASE_URL || "https://www.gushcomics.com";
const TARGETS = [
  {
    route: "/read/series-001/series-001e1",
    label: "The Last Kingdom",
  },
  {
    route: "/read/series-012/series-012e1",
    label: "Wild Hearts",
  },
];

const FORBIDDEN_VISIBLE_TEXT = [
  "Comic reader content region.",
  "Comic page stream placeholder.",
  "Page unavailable",
  "Tap to retry",
];

async function assertReaderRoute(page, target) {
  const url = `${BASE_URL}${target.route}`;
  await page.goto(url, { waitUntil: "networkidle" });

  const comicRegion = page.getByTestId("comic-reader-content");
  await comicRegion.waitFor({ state: "visible", timeout: 30000 });

  const regionTitle = page.getByRole("heading", { name: target.label });
  await regionTitle.waitFor({ state: "visible", timeout: 30000 });

  const bodyText = await page.locator("body").evaluate((node) => node.innerText || "");
  for (const text of FORBIDDEN_VISIBLE_TEXT) {
    if (bodyText.includes(text)) {
      throw new Error(`[${target.route}] still shows forbidden reader text: ${text}`);
    }
  }

  const comicImages = page.locator('[data-testid="comic-reader-content"] img[alt="Comic page"]');
  const visibleImageCount = await comicImages.count();
  if (visibleImageCount < 1) {
    throw new Error(`[${target.route}] comic reader rendered without visible Comic page images.`);
  }

  const contentBeforeEndPanel = await page.evaluate(() => {
    const comicContent = document.querySelector('[data-testid="comic-reader-content"]');
    const endPanel = document.querySelector('[data-testid="reader-end-panel"]');
    if (!comicContent || !endPanel) {
      return false;
    }
    return Boolean(
      comicContent.compareDocumentPosition(endPanel) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  if (!contentBeforeEndPanel) {
    throw new Error(
      `[${target.route}] comic content container does not appear before the end-of-chapter panel.`,
    );
  }

  console.log(`PASS ${target.route}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 2200 },
    });

    for (const target of TARGETS) {
      await assertReaderRoute(page, target);
    }

    console.log(`Production reader smoke passed against ${BASE_URL}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
