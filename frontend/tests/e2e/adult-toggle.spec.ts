import { expect, test } from "@playwright/test";

test.describe("Header adult toggle", () => {
  test("should be clickable on mobile and open a gate modal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await page.waitForLoadState("load");
    await expect(page.locator("body")).not.toBeEmpty({ timeout: 15000 });

    const adultToggle = page.getByTestId("adult-toggle-button");
    await expect(adultToggle).toBeVisible({ timeout: 15000 });
    await expect(adultToggle).toHaveAttribute("aria-label", "Adult content");
    await adultToggle.click();

    const signInHeading = page.getByRole("heading", { name: /Sign in/i });
    const ageHeading = page.getByRole("heading", { name: "Confirm your age", exact: true });
    await expect(signInHeading.or(ageHeading)).toBeVisible();
  });
});
