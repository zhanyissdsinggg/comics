import { expect, test } from "@playwright/test";

test.describe("Login modal experience", () => {
  test.describe.configure({ timeout: 60000 });

  test("should open a single login modal without exposing configuration error copy", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;

      if (
        pathname === "/api/health" ||
        pathname === "/api/health/ready" ||
        pathname === "/api/health/live"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, dbOk: true }),
        });
        return;
      }

      if (pathname === "/api/meta/version") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            name: "gush-backend",
            version: "0.1.0",
            commit: "test-commit",
          }),
        });
        return;
      }

      if (pathname === "/api/regions/config") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ regions: [], defaultRegion: "US" }),
        });
        return;
      }

      if (pathname === "/api/branding") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ branding: {} }),
        });
        return;
      }

      if (pathname === "/api/auth/me") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: null }),
        });
        return;
      }

      if (pathname === "/api/preferences") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ adult: false, autoplay: false }),
        });
        return;
      }

      if (pathname === "/api/series") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ series: [] }),
        });
        return;
      }

      if (pathname === "/api/recommendations/homepage") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ slots: [] }),
        });
        return;
      }

      if (pathname === "/api/tracking" || pathname === "/api/events/batch") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    const response = await page.goto("/?openLogin=1", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const promptHeading = page.getByRole("heading", {
      name: "Sign in to continue",
      exact: true,
    });
    const heading = page.getByRole("heading", { name: /^Sign in$/i });

    if (await promptHeading.isVisible()) {
      const promptContainer = page
        .locator("div")
        .filter({ has: promptHeading })
        .first();
      const promptSignIn = promptContainer.getByRole("button", {
        name: "Sign In",
        exact: true,
      });
      await expect(promptSignIn).toBeVisible();
      await promptSignIn.click();
    }

    await expect(heading).toBeVisible();
    await expect(page.getByText(/Google Client ID/i)).toHaveCount(0);
    await expect(page.locator("form:visible")).toHaveCount(1);
  });
});
