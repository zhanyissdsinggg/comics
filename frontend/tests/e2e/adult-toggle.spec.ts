import { expect, test } from "@playwright/test";

test.describe("Header adult toggle", () => {
  test("mature access entry should stay outside the mobile bottom navigation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await page.waitForLoadState("load");
    await expect(page.locator("body")).not.toBeEmpty({ timeout: 15000 });

    const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: /Mature|18\+/i })).toHaveCount(0);
  });

  test("adult route should redirect signed-out readers to the mature gate", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/adult", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/adult-gate\?reason=NEED_LOGIN/);
    await expect(
      page.getByRole("heading", { name: /Sign in to access Mature Mode/i }),
    ).toBeVisible();
  });

  test("adult route should require age confirmation before showing mature catalog", async ({ page }) => {
    await page.context().addCookies([
      {
        name: "mn_is_signed_in",
        value: "1",
        url: "http://127.0.0.1:4173",
      },
      {
        name: "mn_adult_confirmed",
        value: "0",
        url: "http://127.0.0.1:4173",
      },
      {
        name: "mn_adult_mode",
        value: "0",
        url: "http://127.0.0.1:4173",
      },
    ]);

    await page.goto("/adult", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/adult-gate\?reason=NEED_AGE_CONFIRM/);
    await expect(
      page.getByRole("heading", { name: "Confirm your age", exact: true }),
    ).toBeVisible();
  });
});
