import { expect, test } from "@playwright/test";

test.describe("Header adult toggle", () => {
  test("mobile bottom navigation should expose the same 18+ mode entry", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await page.waitForLoadState("load");
    await expect(page.locator("body")).not.toBeEmpty({ timeout: 15000 });

    const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
    await expect(bottomNav).toBeVisible();
    await expect(
      bottomNav.getByRole("button", { name: /Enter 18\+ mode|18\+/i }),
    ).toBeVisible();
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

  test("adult route should trust real session auth even without signed-in hint cookie", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: "mn_session",
        value: "session-token-123",
        url: "http://127.0.0.1:4173",
      },
      {
        name: "mn_mature_status",
        value: encodeURIComponent(
          JSON.stringify({
            verified: true,
            provider: "local-gate",
            region: "global",
            expiresAt: null,
            referenceId: null,
            verifiedAt: "2026-04-24T12:00:00.000Z",
            matureModeEnabled: true,
            hideAdultHistory: false,
          }),
        ),
        url: "http://127.0.0.1:4173",
      },
    ]);

    await page.route("http://127.0.0.1:4000/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isSignedIn: true,
          user: {
            id: "reader-001",
            email: "reader@example.com",
          },
        }),
      });
    });

    await page.route("http://127.0.0.1:4000/api/preferences", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          preferences: {
            region: "global",
            hideAdultHistory: false,
            matureModeEnabled: true,
            matureVerification: {
              verified: true,
              provider: "local-gate",
              region: "global",
              expiresAt: null,
              referenceId: null,
              verifiedAt: "2026-04-24T12:00:00.000Z",
            },
          },
        }),
      });
    });

    await page.route("http://127.0.0.1:4000/api/series?adult=1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          series: [
            {
              id: "series-012",
              title: "Midnight Heat",
              adult: true,
              type: "comic",
              coverTone: "#4b1730",
              coverUrl: "",
              latest: "Ep 2",
              latestEpisodeId: "series-012e2",
              episodeCount: 2,
              genres: ["Mature", "Thriller"],
              status: "Ongoing",
              description: "Late-night city thriller.",
              creator: {
                label: "Vale After Dark",
                type: "studio",
                slug: "vale-after-dark",
                creatorId: "creator_vale_after_dark",
                isFallback: false,
              },
              creatorCredits: [],
            },
          ],
        }),
      });
    });

    await page.goto("/adult", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/adult$/);
    await expect(page.getByRole("heading", { name: "Mature Mode On" })).toBeVisible();
  });
});
