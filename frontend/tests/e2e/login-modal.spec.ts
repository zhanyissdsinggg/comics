import { expect, test } from "@playwright/test";

test.describe("Login modal experience", () => {
  test("should open a single login modal without exposing configuration error copy", async ({ page }) => {
    const response = await page.goto("/?openLogin=1", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const promptHeading = page.getByRole("heading", { name: "Sign in to continue", exact: true });
    const heading = page.getByRole("heading", { name: /^Sign in$/i });

    if (await promptHeading.isVisible()) {
      const promptContainer = page.locator("div").filter({ has: promptHeading }).first();
      const promptSignIn = promptContainer.getByRole("button", { name: "Sign In", exact: true });
      await expect(promptSignIn).toBeVisible();
      await promptSignIn.click();
    }

    await expect(heading).toBeVisible();
    await expect(page.getByText(/Google Client ID/i)).toHaveCount(0);
    await expect(page.locator("form:visible")).toHaveCount(1);
  });
});


