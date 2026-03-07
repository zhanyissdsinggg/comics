import { expect, test } from "@playwright/test";

test.describe("Header adult toggle", () => {
  test("should be clickable on mobile and open a gate modal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const adultToggle = page.getByRole("button", { name: /Adult content/i });
    await expect(adultToggle).toBeVisible();
    await adultToggle.click();

    const signInHeading = page.getByRole("heading", { name: /Sign in/i });
    const ageHeading = page.getByRole("heading", { name: "Confirm your age", exact: true });
    await expect(signInHeading.or(ageHeading)).toBeVisible();
  });
});
