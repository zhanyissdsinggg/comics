import { expect, test } from "@playwright/test";

test.describe("Auth link pages", () => {
  test("verify page should auto-submit an email link without showing a raw token field", async ({
    page,
  }) => {
    let verifyCalls = 0;

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

      if (pathname === "/api/auth/verify") {
        verifyCalls += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, success: true }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    const response = await page.goto("/auth/verify?token=verify-token", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText("Email verified")).toBeVisible();
    await expect(page.getByText("No code field required.")).toBeVisible();
    await expect(
      page.locator('input[placeholder="Verification token"]'),
    ).toHaveCount(0);
    expect(verifyCalls).toBeGreaterThan(0);
  });

  test("reset page without a token should guide readers to request a fresh email", async ({
    page,
  }) => {
    let requestResetCalls = 0;

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

      if (pathname === "/api/auth/request-reset") {
        requestResetCalls += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, success: true }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    const response = await page.goto("/auth/reset", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator('input[placeholder="Reset token"]')).toHaveCount(
      0,
    );
    await page.fill(
      'input[placeholder="name@example.com"]',
      "reader@example.com",
    );
    await page
      .getByRole("button", { name: "Email me a reset link", exact: true })
      .click();
    await expect(page.getByText("Check your inbox")).toBeVisible();
    expect(requestResetCalls).toBe(1);
  });
});
