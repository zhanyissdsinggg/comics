import { chromium } from "@playwright/test";

const BASE_URL =
  process.env.READER_PROD_BASE_URL || "https://www.gushcomics.com";
const TARGETS = [
  {
    route: "/read/series-001/series-001e1",
    label: "The Last Kingdom",
    kind: "comic",
  },
  {
    route: "/read/series-010/series-010e1",
    label: "Crimson Tide",
    kind: "comic",
  },
  {
    route: "/read/series-011/series-011e1",
    label: "Solar Wind",
    kind: "novel",
  },
  {
    route: "/read/series-012/series-012e1",
    label: "Wild Hearts",
    kind: "comic",
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

  const regionTitle = page.getByRole("heading", { name: target.label });
  await regionTitle.waitFor({ state: "visible", timeout: 30000 });

  const bodyText = await page
    .locator("body")
    .evaluate((node) => node.innerText || "");
  for (const text of FORBIDDEN_VISIBLE_TEXT) {
    if (bodyText.includes(text)) {
      throw new Error(
        `[${target.route}] still shows forbidden reader text: ${text}`,
      );
    }
  }

  if (target.kind === "novel") {
    const novelRegion = page.getByTestId("novel-reader-content");
    await novelRegion.waitFor({ state: "visible", timeout: 30000 });

    const paragraphCount = await page.evaluate(() => {
      const region = document.querySelector(
        '[data-testid="novel-reader-content"]',
      );
      if (!region) {
        return 0;
      }
      return region.querySelectorAll("article p").length;
    });

    if (paragraphCount < 1) {
      throw new Error(
        `[${target.route}] novel reader rendered without visible story paragraphs.`,
      );
    }

    console.log(`PASS ${target.route}`);
    return;
  }

  const comicRegion = page.getByTestId("comic-reader-content");
  await comicRegion.waitFor({ state: "visible", timeout: 30000 });

  const comicImages = page.locator('[data-testid="comic-reader-content"] img');
  const visibleImageCount = await comicImages.count();
  if (visibleImageCount < 1) {
    throw new Error(
      `[${target.route}] comic reader rendered without any comic images.`,
    );
  }

  const firstImage = comicImages.first();
  await firstImage.waitFor({ state: "visible", timeout: 30000 });

  const imageDetails = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll('[data-testid="comic-reader-content"] img'),
    ).map((node) => ({
      src: node.getAttribute("src") || "",
      alt: node.getAttribute("alt") || "",
    })),
  );

  const hasVisibleApprovedImage = imageDetails.some(
    (item) =>
      Boolean(item.src) &&
      !item.src.includes("/fallback/reader-page-default.svg"),
  );
  if (!hasVisibleApprovedImage) {
    throw new Error(
      `[${target.route}] comic reader did not render an approved comic image source.`,
    );
  }

  const hasSpecificAlt = imageDetails.some((item) =>
    new RegExp(`^${target.label} (Chapter|Episode) 1 page \\d+$`, "i").test(
      item.alt,
    ),
  );
  if (!hasSpecificAlt) {
    throw new Error(
      `[${target.route}] comic reader images are missing specific alt text for ${target.label}.`,
    );
  }

  const hasGenericAlt = imageDetails.some(
    (item) => String(item.alt || "").trim().toLowerCase() === "comic page",
  );
  if (hasGenericAlt) {
    throw new Error(
      `[${target.route}] comic reader still renders generic \"Comic page\" alt text.`,
    );
  }

  const contentBeforeEndPanel = await page.evaluate(() => {
    const comicContent = document.querySelector(
      '[data-testid="comic-reader-content"]',
    );
    const endPanel = document.querySelector('[data-testid="reader-end-panel"]');
    if (!comicContent || !endPanel) {
      return false;
    }
    return Boolean(
      comicContent.compareDocumentPosition(endPanel) &
      Node.DOCUMENT_POSITION_FOLLOWING,
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
