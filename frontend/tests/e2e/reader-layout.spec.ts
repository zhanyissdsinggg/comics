import { expect, test } from "@playwright/test";
import { createReaderPagePlaceholder } from "./support/placeholders";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { expectNoBasicA11yAuditIssues } from "./support/a11yAudit";

const baseSeriesPayload = {
  series: {
    id: "series-001",
    title: "The Last Kingdom",
    type: "comic",
    adult: false,
    status: "Ongoing",
    description: "Mocked series for reader layout tests.",
    rating: 4.8,
    ratingCount: 2341,
  },
  episodes: [
    {
      id: "series-001e1",
      seriesId: "series-001",
      number: 1,
      title: "Episode 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
    },
    {
      id: "series-001e2",
      seriesId: "series-001",
      number: 2,
      title: "Episode 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
    },
    {
      id: "series-001e3",
      seriesId: "series-001",
      number: 3,
      title: "Episode 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
    },
  ],
};

type ReaderMockOptions = {
  pricePts?: number;
  signedIn?: boolean;
  unlockedEpisodeIds?: string[];
};

async function mockReaderRoutes(page, options: ReaderMockOptions = {}) {
  const pricePts = Number(options.pricePts ?? 0);
  const signedIn = options.signedIn ?? false;
  const unlockedEpisodeIds = Array.isArray(options.unlockedEpisodeIds)
    ? options.unlockedEpisodeIds
    : [];

  const seriesPayload = {
    ...baseSeriesPayload,
    episodes: baseSeriesPayload.episodes.map((episode, index) => ({
      ...episode,
      pricePts: index === 0 ? pricePts : episode.pricePts,
    })),
  };

  const episodePayload = {
    episode: {
      id: "series-001e1",
      seriesId: "series-001",
      title: "Episode 1",
      type: "comic",
      pricePts,
      previewFreePages: 3,
      pages: [
        { url: createReaderPagePlaceholder("The Last Kingdom Ep1 P1"), w: 800, h: 1200 },
        { url: createReaderPagePlaceholder("The Last Kingdom Ep1 P2"), w: 800, h: 1200 },
        { url: createReaderPagePlaceholder("The Last Kingdom Ep1 P3"), w: 800, h: 1200 },
      ],
      paragraphs: [],
    },
  };

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
        body: JSON.stringify({ name: "gush-backend", version: "0.1.0", commit: "test-commit" }),
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

    if (pathname === "/api/regions/config") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ regions: [], defaultRegion: "US" }),
      });
      return;
    }

    if (pathname === "/api/auth/me") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isSignedIn: signedIn,
          user: signedIn ? { id: "reader-001", email: "reader@example.com" } : null,
        }),
      });
      return;
    }

    if (pathname === "/api/preferences") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          preferences: {
            region: "global",
            language: "en",
            hideAdultHistory: false,
            matureModeEnabled: false,
            matureVerification: {
              verified: false,
              provider: "local-gate",
              region: "global",
              expiresAt: null,
              referenceId: null,
              verifiedAt: null,
            },
          },
        }),
      });
      return;
    }

    if (pathname === "/api/episode") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(episodePayload),
      });
      return;
    }

    if (pathname === "/api/series/series-001") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(seriesPayload),
      });
      return;
    }

    if (pathname === "/api/wallet") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          wallet: {
            paidPts: 60,
            bonusPts: 20,
            subscription: null,
            subscriptionUsage: { remaining: 0 },
          },
        }),
      });
      return;
    }

    if (pathname === "/api/entitlements") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          entitlement: {
            seriesId: "series-001",
            unlockedEpisodeIds,
          },
        }),
      });
      return;
    }

    if (pathname === "/api/events/batch") {
      await route.fulfill({
        status: 201,
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
}

test.describe("Reader layout", () => {
  test("mobile reader should keep a stable first paint, open settings, and avoid horizontal overflow", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page);

    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/read/series-001/series-001e1", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const settingsButton = page.getByRole("button", { name: "Reader Settings" }).first();
    await expect(page.getByText("The Last Kingdom").first()).toBeVisible();
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    await expect(page.getByText("Live controls")).toBeVisible();

    const layout = await page.evaluate(() => {
      const wrappers = Array.from(document.querySelectorAll("main [data-index]"));
      return wrappers.map((wrapper) => {
        const element = wrapper as HTMLElement;
        const image = element.querySelector("img") as HTMLImageElement | null;
        return {
          offsetTop: element.offsetTop,
          offsetHeight: element.offsetHeight,
          imageHeight: image ? image.clientHeight : 0,
        };
      });
    });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );

    expect(overflow).toBeLessThanOrEqual(1);
    expect(layout.length).toBeGreaterThanOrEqual(3);

    for (const item of layout) {
      expect(item.offsetHeight).toBeGreaterThan(0);
      expect(item.imageHeight).toBeGreaterThan(0);
    }

    await expectNoBasicA11yAuditIssues(page, "/read/series-001/series-001e1", {
      ignoreImagesInside: ["main [data-index]"],
    });
    await expectNoRuntimeIssues("/read/series-001/series-001e1", runtimeIssues);
  });

  test("reader actions should save and remove a bookmark without crashing", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page);

    const response = await page.goto("/read/series-001/series-001e1", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const readerActionsButton = page.getByRole("button", { name: "Reader actions" });
    await expect(page.getByText("The Last Kingdom").first()).toBeVisible();
    await expect(readerActionsButton).toBeVisible();

    await readerActionsButton.click();
    await page.getByRole("button", { name: /Save bookmark/i }).click();
    await expect(page.getByText("Bookmark saved")).toBeVisible();

    await readerActionsButton.click();
    await page.getByRole("button", { name: /Remove bookmark/i }).click();
    await expect(page.getByText("Bookmark removed")).toBeVisible();

    await expectNoRuntimeIssues("/read/series-001/series-001e1#bookmarks", runtimeIssues);
  });

  test("locked reader should render the unlock card without crashing", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page, { pricePts: 24 });

    const response = await page.goto("/read/series-001/series-001e1", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText(/Unlock the rest of this/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in to unlock" })).toBeVisible();

    await expectNoRuntimeIssues("/read/series-001/series-001e1#unlock", runtimeIssues);
  });
});
