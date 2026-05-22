import { expect, test } from "@playwright/test";
import { createReaderPagePlaceholder } from "./support/placeholders";

const seriesPayload = {
  series: {
    id: "series-001",
    title: "The Last Kingdom",
    type: "comic",
    adult: false,
    status: "Ongoing",
    description: "Mocked series for reader fallback asset tests.",
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
  ],
};

const episodePayload = {
  episode: {
    id: "series-001e1",
    seriesId: "series-001",
    title: "Episode 1",
    type: "comic",
    pricePts: 0,
    previewFreePages: 3,
    pages: [
      {
        url: createReaderPagePlaceholder("The Last Kingdom Ep1 P1"),
        w: 800,
        h: 1200,
      },
      {
        url: createReaderPagePlaceholder("The Last Kingdom Ep1 P2"),
        w: 800,
        h: 1200,
      },
      {
        url: createReaderPagePlaceholder("The Last Kingdom Ep1 P3"),
        w: 800,
        h: 1200,
      },
    ],
    paragraphs: [],
  },
};

test.describe("Reader fallback assets", () => {
  test("reader should keep fallback reader pages on first paint without third-party image hosts", async ({
    page,
  }) => {
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

    const response = await page.goto(
      "/read/series-001/series-001e1?entry=reader-fallback-assets",
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("region", { name: "Comic reader content" }).first(),
    ).toBeVisible();
    await expect(page.getByText("The Last Kingdom").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /Story preview artwork|Reader fallback|Page preview|Current reader label|Core palette enabled/i,
    );
    await expect(page.locator("body")).not.toContainText(
      /Comic pages loading before chapter navigation and comments|Comic reader content starts here before chapter end and comments/i,
    );
    await expect(
      page.getByRole("img", { name: "The Last Kingdom Chapter 1 page 1" }),
    ).toBeAttached();

    const pageImageSources = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-index] img")).map(
        (node) => node.getAttribute("src") || "",
      ),
    );

    expect(
      pageImageSources.some(
        (value) =>
          value.includes("placehold.co") || value.includes("img2.baidu.com"),
      ),
    ).toBeFalsy();
  });
});
