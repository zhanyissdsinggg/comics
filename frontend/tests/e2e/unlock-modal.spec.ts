import { expect, test, type Route } from "@playwright/test";
import { createPosterPlaceholder } from "./support/placeholders";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { expectNoBasicA11yAuditIssues } from "./support/a11yAudit";
import { expectVisibleFocusIndicator } from "./support/keyboard";

const SERIES_PAYLOAD = {
  series: {
    id: "series-locked",
    title: "Midnight Static",
    author: "Signal House",
    type: "comic",
    adult: false,
    status: "Ongoing",
    description: "Mocked series for unlock modal coverage.",
    coverUrl: createPosterPlaceholder("Midnight Static"),
    rating: 4.7,
    ratingCount: 1280,
    followers: 4200,
    views: 9800,
    badge: "NEW",
    badges: ["NEW"],
    genres: ["Fantasy", "Action"],
    freeEpisodeCount: 1,
    hasFreeEpisodes: true,
    isPublished: true,
    updatedAt: "2026-03-11T08:00:00.000Z",
  },
  episodes: [
    {
      id: "series-locked-e1",
      seriesId: "series-locked",
      number: 1,
      title: "Episode 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-03-01T08:00:00.000Z",
    },
    {
      id: "series-locked-e2",
      seriesId: "series-locked",
      number: 2,
      title: "Episode 2",
      pricePts: 15,
      previewFreePages: 0,
      ttfEligible: false,
      releasedAt: "2026-03-08T08:00:00.000Z",
    },
  ],
} as const;

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.describe("Unlock chapter modal", () => {
  test("series episode lock should open the new unlock modal and reveal USD point packs when balance is low", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;
      const searchParams = requestUrl.searchParams;

      if (pathname === "/api/health" || pathname === "/api/health/ready" || pathname === "/api/health/live") {
        await fulfillJson(route, { ok: true, dbOk: true });
        return;
      }

      if (pathname === "/api/meta/version") {
        await fulfillJson(route, { name: "gush-backend", version: "0.1.0", commit: "test-commit" });
        return;
      }

      if (pathname === "/api/regions/config") {
        await fulfillJson(route, { regions: [], defaultRegion: "US" });
        return;
      }

      if (pathname === "/api/branding") {
        await fulfillJson(route, { branding: {} });
        return;
      }

      if (pathname === "/api/auth/me") {
        await fulfillJson(route, { user: { id: "user-locked", email: "reader@example.com" } });
        return;
      }

      if (pathname === "/api/preferences") {
        await fulfillJson(route, { adult: false, autoplay: false });
        return;
      }

      if (pathname === "/api/series/series-locked") {
        await fulfillJson(route, SERIES_PAYLOAD);
        return;
      }

      if (pathname === "/api/recommendations/similar/series-locked") {
        await fulfillJson(route, { recommendations: [] });
        return;
      }

      if (pathname === "/api/entitlements" && route.request().method() === "GET" && searchParams.get("seriesId") === "series-locked") {
        await fulfillJson(route, {
          entitlement: {
            seriesId: "series-locked",
            unlockedEpisodeIds: [],
          },
        });
        return;
      }

      if (pathname === "/api/wallet") {
        await fulfillJson(route, {
          wallet: {
            paidPts: 2,
            bonusPts: 0,
            plan: "free",
            subscription: null,
            subscriptionUsage: { remaining: 0 },
          },
        });
        return;
      }

      if (pathname === "/api/coupons") {
        await fulfillJson(route, { coupons: [] });
        return;
      }

      if (pathname === "/api/progress") {
        await fulfillJson(route, { progress: [] });
        return;
      }

      if (pathname === "/api/billing/topups") {
        await fulfillJson(route, {
          packages: [
            {
              packageId: "starter",
              label: "Starter",
              price: 4.99,
              currency: "USD",
              paidPts: 50,
              bonusPts: 5,
              tags: ["Best for trial"],
            },
            {
              packageId: "medium",
              label: "Medium",
              price: 9.99,
              currency: "USD",
              paidPts: 100,
              bonusPts: 15,
              tags: ["Popular"],
            },
            {
              packageId: "value",
              label: "Value",
              price: 18.99,
              currency: "USD",
              paidPts: 200,
              bonusPts: 40,
              tags: ["Best value"],
            },
          ],
          billing: {
            purchaseActionsEnabled: true,
          },
        });
        return;
      }

      if (pathname === "/api/events/batch") {
        await fulfillJson(route, { ok: true });
        return;
      }

      await fulfillJson(route, {});
    });

    const response = await page.goto("/series/series-locked", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await page.getByRole("heading", { name: "Midnight Static" }).waitFor({ state: "visible" });
    await expect(page.getByRole("img", { name: "Comic cover image for Midnight Static" })).toBeVisible();

    const episodeRow = page.locator("#episode-series-locked-e2");
    const unlockButton = episodeRow.getByRole("button", { name: "Unlock with Points" });
    await expect(episodeRow).toBeVisible();
    await unlockButton.focus();
    await expect(unlockButton).toBeFocused();
    await expectVisibleFocusIndicator(unlockButton, "Locked episode unlock button");
    await unlockButton.dispatchEvent("click");

    const dialog = page.getByRole("dialog", { name: /Unlock Chapter 2/i });
    const closeButton = dialog.getByRole("button", { name: "Close unlock modal" });
    const primaryButton = dialog.getByRole("button", { name: "Get More Points" });

    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.getByText("Unlock Chapter 2 for 15 Points")).toBeVisible();
    await expect(primaryButton).toBeVisible();
    await expect(closeButton).toBeVisible();
    await closeButton.focus();
    await expect(closeButton).toBeFocused();
    await expectVisibleFocusIndicator(closeButton, "Unlock modal close button");
    await primaryButton.focus();
    await expect(primaryButton).toBeFocused();
    await expectVisibleFocusIndicator(primaryButton, "Unlock modal primary button");

    await primaryButton.dispatchEvent("click");

    await expect(dialog.getByText("$4.99 for 55 Points")).toBeVisible();
    await expect(dialog.getByText("$9.99 for 115 Points")).toBeVisible();
    await expect(dialog.getByText("$18.99 for 240 Points")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Buy" }).first()).toBeVisible();
    await expectNoBasicA11yAuditIssues(page, "/series/series-locked");
    await expectNoRuntimeIssues("/series/series-locked", runtimeIssues);
  });
});
