import { expect, test } from "@playwright/test";

test.describe("Header search", () => {
  test("should open quick paths on focus and close on outside click", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const searchInput = page.getByRole("searchbox", {
      name: "Search series, creators, or genres",
    });
    await searchInput.focus();

    await expect(page.getByText(/^Start with$/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Trending/i })).toBeVisible();

    await page.evaluate(() => {
      document.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          clientX: 8,
          clientY: 120,
        }),
      );
    });

    await expect(page.getByText(/^Start with$/)).toHaveCount(0);
  });
});
