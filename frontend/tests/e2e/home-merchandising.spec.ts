import { expect, test, type Route } from "@playwright/test";
import { createBannerPlaceholder, createPosterPlaceholder } from "./support/placeholders";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const HOME_UI_TIMEOUT_MS = 15000;
const HOME_SERIES_BODY = {
  series: [
    {
      id: "series-default-hot",
      title: "Atlas Prime",
      author: "Northline Studio",
      type: "comic",
      status: "Completed",
      adult: false,
      description: "The default chart monster that would win without homepage overrides.",
      coverUrl: createPosterPlaceholder("Atlas Prime"),
      bannerUrl: createBannerPlaceholder("Atlas Prime"),
      badge: "HOT",
      badges: ["HOT"],
      genres: ["Action", "Sci-Fi"],
      episodeCount: 64,
      latestEpisodeId: "episode-64",
      freeEpisodeCount: 6,
      hasFreeEpisodes: true,
      rating: 4.9,
      ratingCount: 5000,
      followers: 22000,
      views: 81000,
      isPublished: true,
      updatedAt: "2026-03-15T08:00:00.000Z",
    },
    {
      id: "series-slot-hero",
      title: "Velvet Voltage",
      author: "Paper Harbor",
      type: "comic",
      status: "Ongoing",
      adult: false,
      description: "Manual hero pick that should lead the homepage carousel.",
      coverUrl: createPosterPlaceholder("Velvet Voltage"),
      bannerUrl: createBannerPlaceholder("Velvet Voltage"),
      badge: "",
      badges: [],
      genres: ["Romance", "Drama"],
      episodeCount: 18,
      latestEpisodeId: "episode-18",
      freeEpisodeCount: 2,
      hasFreeEpisodes: true,
      rating: 4.1,
      ratingCount: 210,
      followers: 2800,
      views: 9200,
      isPublished: true,
      updatedAt: "2026-03-14T08:00:00.000Z",
    },
    {
      id: "series-slot-free",
      title: "Soft Launch Kiss",
      author: "Blue Meadow",
      type: "comic",
      status: "Ongoing",
      adult: false,
      description: "Manual free-start pick for first-time readers.",
      coverUrl: createPosterPlaceholder("Soft Launch Kiss"),
      badge: "",
      badges: [],
      genres: ["Romance", "Comedy"],
      episodeCount: 12,
      latestEpisodeId: "episode-12",
      freeEpisodeCount: 1,
      hasFreeEpisodes: true,
      rating: 4.0,
      ratingCount: 160,
      followers: 1900,
      views: 6100,
      isPublished: true,
      updatedAt: "2026-03-13T08:00:00.000Z",
    },
    {
      id: "series-slot-binge",
      title: "Last Ember Files",
      author: "Nocturne Works",
      type: "comic",
      status: "Completed",
      adult: false,
      description: "Manual binge-ready pick that should replace the default chart leader.",
      coverUrl: createPosterPlaceholder("Last Ember Files"),
      badge: "",
      badges: [],
      genres: ["Thriller", "Mystery"],
      episodeCount: 30,
      latestEpisodeId: "episode-30",
      freeEpisodeCount: 0,
      hasFreeEpisodes: false,
      rating: 4.0,
      ratingCount: 140,
      followers: 1600,
      views: 5400,
      isPublished: true,
      updatedAt: "2026-03-12T08:00:00.000Z",
    },
    {
      id: "series-slot-breakout",
      title: "Rocket Choir",
      author: "Signal House",
      type: "comic",
      status: "Ongoing",
      adult: false,
      description: "Manual breakout pick tied to live search momentum.",
      coverUrl: createPosterPlaceholder("Rocket Choir"),
      badge: "NEW",
      badges: ["NEW"],
      genres: ["Fantasy", "Action"],
      episodeCount: 9,
      latestEpisodeId: "episode-9",
      freeEpisodeCount: 0,
      hasFreeEpisodes: false,
      rating: 4.1,
      ratingCount: 120,
      followers: 1500,
      views: 5000,
      isPublished: true,
      updatedAt: "2026-03-11T08:00:00.000Z",
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

test.describe("Homepage merchandising sync", () => {
  test("home should honor admin-managed homepage slots", async ({ page }) => {
    await page.route("**/api/health", async (route) => {
      await fulfillJson(route, { ok: true });
    });
    await page.route("**/api/branding**", async (route) => {
      await fulfillJson(route, { branding: {} });
    });
    await page.route("**/api/series**", async (route) => {
      await fulfillJson(route, HOME_SERIES_BODY);
    });
    await page.route("**/api/search/hot**", async (route) => {
      await fulfillJson(route, {
        keywords: [{ keyword: "rocket choir", count: 920, growthLabel: "Trending now" }],
      });
    });
    await page.route("**/api/recommendations/homepage**", async (route) => {
      await fulfillJson(route, {
        slots: [
          {
            id: "slot-home-hero",
            slot: "home-hero",
            seriesIds: ["series-slot-hero", "series-slot-breakout"],
          },
          {
            id: "slot-home-free-start",
            slot: "home-free-start",
            seriesIds: ["series-slot-free"],
          },
          {
            id: "slot-home-binge-ready",
            slot: "home-binge-ready",
            seriesIds: ["series-slot-binge"],
          },
          {
            id: "slot-home-breakout",
            slot: "home-breakout",
            seriesIds: ["series-slot-breakout"],
          },
        ],
      });
    });
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("main")).toContainText(/Velvet Voltage|Rocket Choir/, {
      timeout: HOME_UI_TIMEOUT_MS,
    });

    const homepageMain = page.locator("main");

    await expect(homepageMain).toContainText("Binge Last Ember Files without waiting on the next update.", {
      timeout: HOME_UI_TIMEOUT_MS,
    });
    await expect(homepageMain).toContainText("Soft Launch Kiss is an easy place to start for free.", {
      timeout: HOME_UI_TIMEOUT_MS,
    });
    await expect(homepageMain).toContainText("Rocket Choir is climbing fast this week.", {
      timeout: HOME_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/", runtimeIssues);
  });
});
