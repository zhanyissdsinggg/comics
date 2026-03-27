import { expect, test, type Route } from "@playwright/test";
import { createPosterPlaceholder } from "./support/placeholders";
import { expectNoBasicA11yAuditIssues } from "./support/a11yAudit";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { expectVisibleFocusIndicator } from "./support/keyboard";

const SERIES_LIST = [
  {
    id: "series-alpha",
    title: "Dragon Ledger",
    type: "comic",
    adult: false,
    coverTone: "linear-gradient(160deg, rgba(47,107,255,0.18) 0%, rgba(15,23,42,0.12) 100%)",
    coverUrl: createPosterPlaceholder("Dragon Ledger"),
    badge: "Popular",
    badges: ["Popular"],
    latestEpisodeId: "series-alphae50",
    episodeCount: 50,
    genres: ["Fantasy", "Action"],
    status: "Ongoing",
    rating: 4.8,
    ratingCount: 3420,
    description: "Mocked series alpha.",
    followers: 1200,
    views: 5400,
    freeEpisodeCount: 3,
    hasFreeEpisodes: true,
  },
  {
    id: "series-beta",
    title: "Velvet Archive",
    type: "novel",
    adult: false,
    coverTone: "linear-gradient(160deg, rgba(249,115,22,0.18) 0%, rgba(15,23,42,0.1) 100%)",
    coverUrl: createPosterPlaceholder("Velvet Archive"),
    badge: "New",
    badges: ["New"],
    latestEpisodeId: "series-betae24",
    episodeCount: 24,
    genres: ["Mystery", "Drama"],
    status: "Ongoing",
    rating: 4.6,
    ratingCount: 1840,
    description: "Mocked series beta.",
    followers: 860,
    views: 3200,
    freeEpisodeCount: 2,
    hasFreeEpisodes: true,
  },
  {
    id: "series-gamma",
    title: "Neon Prayer",
    type: "comic",
    adult: false,
    coverTone: "linear-gradient(160deg, rgba(16,185,129,0.18) 0%, rgba(15,23,42,0.1) 100%)",
    coverUrl: createPosterPlaceholder("Neon Prayer"),
    badge: "",
    badges: [],
    latestEpisodeId: "series-gammae18",
    episodeCount: 18,
    genres: ["Sci-Fi", "Thriller"],
    status: "Ongoing",
    rating: 4.5,
    ratingCount: 960,
    description: "Mocked series gamma.",
    followers: 420,
    views: 1800,
    freeEpisodeCount: 1,
    hasFreeEpisodes: true,
  },
] as const;

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.describe("Account My Library", () => {
  test.setTimeout(120000);

  test("signed-in account dashboard should render tabbed library views for continue reading, bookmarks, and unlocked", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;

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
        await fulfillJson(route, {
          isSignedIn: true,
          user: {
            id: "user-001",
            email: "reader@example.com",
            emailVerified: true,
          },
        });
        return;
      }

      if (pathname === "/api/preferences") {
        await fulfillJson(route, {
          preferences: {
            notifyNewEpisode: true,
            notifyTtfReady: true,
            notifyPromo: false,
            region: "global",
            language: "en",
            hideAdultHistory: false,
            displayName: "Reader",
          },
        });
        return;
      }

      if (pathname === "/api/orders") {
        await fulfillJson(route, { orders: [] });
        return;
      }

      if (pathname === "/api/auth/providers") {
        await fulfillJson(route, { providers: { google: false, password: true } });
        return;
      }

      if (pathname === "/api/wallet") {
        await fulfillJson(route, {
          wallet: {
            paidPts: 120,
            bonusPts: 10,
            plan: "free",
            subscription: null,
            subscriptionUsage: { remaining: 0 },
          },
        });
        return;
      }

      if (pathname === "/api/history") {
        await fulfillJson(route, {
          history: [
            {
              id: "history-alpha",
              seriesId: "series-alpha",
              episodeId: "series-alphae12",
              createdAt: "2026-03-26T10:00:00.000Z",
            },
            {
              id: "history-gamma",
              seriesId: "series-gamma",
              episodeId: "series-gammae3",
              createdAt: "2026-03-24T10:00:00.000Z",
            },
          ],
        });
        return;
      }

      if (pathname === "/api/progress") {
        await fulfillJson(route, {
          progress: {
            "series-alpha": {
              lastEpisodeId: "series-alphae12",
              percent: 0.24,
              updatedAt: "2026-03-26T10:05:00.000Z",
            },
            "series-gamma": {
              lastEpisodeId: "series-gammae3",
              percent: 0.55,
              updatedAt: "2026-03-25T09:00:00.000Z",
            },
          },
        });
        return;
      }

      if (pathname === "/api/follow") {
        await fulfillJson(route, {
          followedSeriesIds: ["series-beta"],
        });
        return;
      }

      if (pathname === "/api/bookmarks") {
        await fulfillJson(route, {
          bookmarks: {
            "series-beta": [
              {
                id: "bm-beta",
                seriesId: "series-beta",
                episodeId: "series-betae7",
                percent: 0.12,
                label: "Chapter 7 note",
                createdAt: "2026-03-25T08:30:00.000Z",
              },
            ],
          },
        });
        return;
      }

      if (pathname === "/api/series") {
        await fulfillJson(route, { series: SERIES_LIST });
        return;
      }

      if (pathname === "/api/entitlements") {
        await fulfillJson(route, {
          entitlements: [
            {
              seriesId: "series-alpha",
              unlockedEpisodeIds: Array.from({ length: 12 }, (_, index) => `series-alphae${index + 1}`),
            },
            {
              seriesId: "series-gamma",
              unlockedEpisodeIds: ["series-gammae1", "series-gammae2", "series-gammae3"],
            },
          ],
        });
        return;
      }

      if (pathname === "/api/events/batch") {
        await fulfillJson(route, { ok: true });
        return;
      }

      await fulfillJson(route, {});
    });

    const response = await page.goto("/account", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Keep your next read closer than the settings." })).toBeVisible();

    const continueTab = page.getByRole("tab", { name: /Continue Reading 2/ });
    await expect(continueTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "Dragon Ledger" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("img", { name: "Cover image for Dragon Ledger" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Read Chapter 12 of 50")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Resume" }).first()).toBeVisible({
      timeout: 15000,
    });

    const bookmarksTab = page.getByRole("tab", { name: /Bookmarks 1/ });
    await continueTab.focus();
    await expect(continueTab).toBeFocused();
    await expectVisibleFocusIndicator(continueTab, "Account Continue Reading tab");
    await continueTab.press("Tab");
    await expect(bookmarksTab).toBeFocused();
    await expectVisibleFocusIndicator(bookmarksTab, "Account Bookmarks tab");
    await bookmarksTab.dispatchEvent("click");
    await expect(bookmarksTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "Velvet Archive" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Saved to your shelf with 1 saved spot")).toBeVisible({
      timeout: 10000,
    });

    const unlockedTab = page.getByRole("tab", { name: /Unlocked 2/ });
    await bookmarksTab.press("Tab");
    await expect(unlockedTab).toBeFocused();
    await expectVisibleFocusIndicator(unlockedTab, "Account Unlocked tab");
    await unlockedTab.dispatchEvent("click");
    await expect(unlockedTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("12 chapters unlocked - up to Chapter 12")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Neon Prayer")).toBeVisible({ timeout: 10000 });
    await expectNoBasicA11yAuditIssues(page, "/account");
    await expectNoRuntimeIssues("/account", runtimeIssues);
  });
});
