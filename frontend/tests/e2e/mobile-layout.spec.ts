import { expect, test } from "@playwright/test";

test.describe("Mobile layout", () => {
  test("home should not overflow horizontally", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await page.waitForTimeout(800);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );

    expect(overflow).toBeLessThanOrEqual(1);
  });
});
