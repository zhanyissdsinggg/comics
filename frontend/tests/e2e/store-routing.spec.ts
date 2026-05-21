import { expect, test } from "@playwright/test";

test.describe("Store routing", () => {
  test("prelaunch store should hide membership upsell and keep browse/support routes visible", async ({
    page,
  }) => {
    const response = await page.goto("/store", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", {
        name: /Point packs preview\.|Buy points\./,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Plans", exact: true }),
    ).toHaveCount(0);

    const browseButton = page
      .getByRole("button", { name: "Browse free chapters", exact: true })
      .first();
    await expect(browseButton).toBeVisible();
    await browseButton.click();
    await expect(page).toHaveURL(/\/comics(?:\?|$)/);

    const storeResponse = await page.goto("/store", {
      waitUntil: "domcontentloaded",
    });
    expect(storeResponse?.ok()).toBeTruthy();

    const supportButton = page
      .getByRole("button", { name: "Support", exact: true })
      .first();
    await expect(supportButton).toBeVisible();
    await supportButton.click();
    await expect(page).toHaveURL(/\/support(?:\?|$)/);
  });
});
