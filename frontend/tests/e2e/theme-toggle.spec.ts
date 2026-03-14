import { expect, test } from "@playwright/test";

function getThemeState() {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const isLight = root.classList.contains("light");
  return {
    isDark,
    isLight,
    storageTheme: window.localStorage.getItem("theme"),
  };
}

test.describe("Theme toggle behavior", () => {
  test("mobile header should keep theme toggle visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const toggle = page.locator('button[aria-label^="Switch to "]').first();
    await expect(toggle).toBeVisible();
  });

  test("should switch html theme class and persist theme value", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const toggle = page.locator('button[aria-label^="Switch to "]').first();
    await expect(toggle).toBeVisible();

    const before = await page.evaluate(getThemeState);
    expect(before.isDark || before.isLight).toBeTruthy();
    expect(before.isDark && before.isLight).toBeFalsy();

    await toggle.scrollIntoViewIfNeeded();
    await toggle.evaluate((node) => {
      node.click();
    });

    await page.waitForFunction(() => {
      const root = document.documentElement;
      return root.classList.contains("dark") || root.classList.contains("light");
    });

    const after = await page.evaluate(getThemeState);
    expect(after.isDark || after.isLight).toBeTruthy();
    expect(after.isDark && after.isLight).toBeFalsy();

    expect(after.isDark).toBe(!before.isDark);
    expect(after.isLight).toBe(!before.isLight);

    if (after.isDark) {
      expect(after.storageTheme).toBe("dark");
    } else if (after.isLight) {
      expect(after.storageTheme).toBe("light");
    }
  });
});
