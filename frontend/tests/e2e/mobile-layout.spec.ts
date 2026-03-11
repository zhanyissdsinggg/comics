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

  test("mobile header should hide desktop search shortcut hint", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await page.waitForTimeout(500);
    await expect(page.getByText("Ctrl+K")).toHaveCount(0);
    await expect(page.getByText("?K")).toHaveCount(0);
  });
});
