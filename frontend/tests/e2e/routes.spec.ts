import { expect, test } from "@playwright/test";

const ROUTES = [
  "/",
  "/search",
  "/store",
  "/rankings",
  "/admin/login",
  "/admin",
  "/admin/users",
  "/admin/support",
  "/admin/orders",
  "/admin/promotions",
  "/admin/series",
];

test.describe("Critical route rendering", () => {
  for (const route of ROUTES) {
    test(`should render ${route} without runtime crash`, async ({ page }) => {
      const pageErrors = [];
      page.on("pageerror", (error) => {
        pageErrors.push(error);
      });

      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBeTruthy();

      await expect(page.locator("html")).toBeVisible();
      await expect(page.locator("body")).toBeVisible();

      // Let hydration settle before checking runtime errors.
      await page.waitForTimeout(300);
      expect(pageErrors, `${route} has runtime page errors`).toHaveLength(0);
    });
  }
});
