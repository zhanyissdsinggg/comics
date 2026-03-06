import { expect, test } from "@playwright/test";

test.describe("Login modal experience", () => {
  test("should open login modal without exposing configuration error copy", async ({ page }) => {
    const response = await page.goto("/?openLogin=1", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const promptSignIn = page.getByRole("button", { name: "Sign In", exact: true });
    await expect(promptSignIn).toBeVisible();
    await promptSignIn.click();

    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByText("Google Client ID 未配置")).toHaveCount(0);
  });
});
