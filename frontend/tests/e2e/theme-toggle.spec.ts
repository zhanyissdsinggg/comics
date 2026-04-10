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
  test("homepage should not expose a public theme toggle in the mobile header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator('[data-theme-toggle="1"]')).toHaveCount(0);
  });

  test("homepage should still boot with a valid theme class", async ({
    page,
  }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const before = await page.evaluate(getThemeState);
    expect(before.isDark || before.isLight).toBeTruthy();
    expect(before.isDark && before.isLight).toBeFalsy();

    if (before.storageTheme !== null) {
      expect(["light", "dark"]).toContain(before.storageTheme);
    }
  });
});
