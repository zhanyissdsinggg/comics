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
  /Ã[\w€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/,
  /â€™|â€œ|â€|â€“|â€”|â€¢/,
  /鈥[^\s]?/,
  /锟斤拷/,
  /\uFFFD/,
];

test.describe("Copy integrity", () => {
  for (const route of ROUTES_TO_CHECK) {
    test(`should not show mojibake text on ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBeTruthy();

      await page.waitForLoadState("load");
      await expect(page.locator("body")).not.toBeEmpty();

      const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");

      for (const pattern of MOJIBAKE_PATTERNS) {
        expect(bodyText).not.toMatch(pattern);
      }
    });
  }
});
