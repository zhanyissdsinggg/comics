import { expect, test } from "@playwright/test";
import { CRITICAL_ROUTES } from "../../scripts/critical-routes.mjs";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const ROUTES = CRITICAL_ROUTES;

test.describe("Critical route rendering", () => {
  for (const route of ROUTES) {
    test(`should render ${route} without runtime crash`, async ({ page }) => {
      const runtimeIssues = collectRuntimeIssues(page);

      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok()).toBeTruthy();

      await expect(page.locator("body")).toBeAttached();
      const hasRenderableContent = await page.evaluate(() => {
        const body = document.body;
        if (!body) {
          return false;
        }

        return (
          body.childElementCount > 0 || body.textContent?.trim().length > 0
        );
      });
      expect(hasRenderableContent).toBeTruthy();

      // Let hydration settle before checking runtime errors.
      await page.waitForTimeout(300);
      await expectNoRuntimeIssues(route, runtimeIssues);
    });
  }
});
