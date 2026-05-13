import { expect, test } from "@playwright/test";

const ROUTES_TO_CHECK = [
  "/",
  "/faq",
  "/support",
  "/library",
  "/search",
  "/creators",
  "/rankings",
  "/store",
  "/subscribe",
  "/admin/tracking",
];

const MOJIBAKE_PATTERNS = [
  // Common UTF-8/Latin-1 mojibake fragments.
  /(?:Ã.|Â.|â€|â€™|â€œ|â€\x9d|ðŸ)/,
  // Unicode replacement characters.
  /(?:\uFFFD|�)/,
  // Legacy Chinese mojibake tokens that showed up in old admin copy.
  /(?:鍚庡彴|鏈壘鍒|璇峰厛|杩欎釜|瀵嗛挜|閸|鈧)/,
];

test.describe("Copy integrity", () => {
  for (const route of ROUTES_TO_CHECK) {
    test(`should not show mojibake text on ${route}`, async ({ page }) => {
      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok()).toBeTruthy();

      await page.waitForLoadState("load");
      await expect(page.locator("body")).not.toBeEmpty();

      const bodyText = (await page.locator("body").innerText()).replace(
        /\s+/g,
        " ",
      );

      for (const pattern of MOJIBAKE_PATTERNS) {
        expect(bodyText).not.toMatch(pattern);
      }
    });
  }
});
