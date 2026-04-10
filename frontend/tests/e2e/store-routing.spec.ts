import { expect, test } from "@playwright/test";

test.describe("Store routing", () => {
  test("store upsell should preserve the store source path when opening membership", async ({
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

    const upsellButton = page
      .getByRole("button", { name: "Plans", exact: true })
      .first();

    await expect(upsellButton).toBeVisible();
    await Promise.all([
      page.waitForURL(
        (url) =>
          url.pathname === "/subscribe" &&
          url.searchParams.get("entry") === "STORE_UPSELL",
      ),
      upsellButton.click(),
    ]);

    const nextUrl = new URL(page.url());
    expect(nextUrl.pathname).toBe("/subscribe");
    expect(nextUrl.searchParams.get("entry")).toBe("STORE_UPSELL");
    expect(nextUrl.searchParams.get("sourcePath")).toBe("/store");
    expect(nextUrl.searchParams.get("returnTo")).toBe("/");
  });
});
