import { expect, test } from "@playwright/test";

const ROUTES_TO_CHECK = ["/", "/faq", "/support", "/admin/tracking"];
const MOJIBAKE_PATTERN = /[�]|鈥|闁|鑰佺|锛|鏈€|淇濆|杩/;

test.describe("Copy integrity", () => {
  for (const route of ROUTES_TO_CHECK) {
    test(`should not show mojibake text on ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.ok()).toBeTruthy();

      const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      expect(bodyText).not.toMatch(MOJIBAKE_PATTERN);
    });
  }
});

