import { expect, test } from "@playwright/test";
import { createReaderPagePlaceholder } from "./support/placeholders";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { expectNoBasicA11yAuditIssues } from "./support/a11yAudit";

function createLegacyReaderMockPage(label: string): string {
  const safeLabel = String(label || "Reader page")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" fill="none">
      <rect width="800" height="1200" fill="#070b14" />
      <text x="80" y="120" fill="#F8FAFC" font-family="Arial, sans-serif" font-size="26" font-weight="700">CHAPTER</text>
      <text x="80" y="188" fill="#E5E7EB" font-family="Arial, sans-serif" font-size="42" font-weight="700">${safeLabel}</text>
      <text x="80" y="252" fill="#94A3B8" font-family="Arial, sans-serif" font-size="20">Episode 1 | Page 1</text>
      <text x="80" y="1060" fill="#64748B" font-family="Arial, sans-serif" font-size="20">Story preview artwork.</text>
      <text x="80" y="1110" fill="#64748B" font-family="Arial, sans-serif" font-size="20">Reader fallback</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

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
  seriesPayload?: Record<string, unknown>;
  episodePayload?: Record<string, unknown>;
  seriesId?: string;
  episodeId?: string;
};

const LOCKED_TEST_SERIES_ID = "series-005";
const LOCKED_TEST_EPISODE_ID = `${LOCKED_TEST_SERIES_ID}e3`;
const NOVEL_TEST_SERIES_ID = "series-011";
const NOVEL_TEST_EPISODE_ID = `${NOVEL_TEST_SERIES_ID}e1`;
const NOVEL_TEST_TITLE = "Solar Wind";
const CLEAN_FREE_READER_SERIES = [
  {
    seriesId: "series-001",
    episodeId: "series-001e1",
    title: "The Last Kingdom",
  },
  {
    seriesId: "series-002",
    episodeId: "series-002e1",
    title: "Moonlight Sonata",
  },
  {
    seriesId: "series-010",
    episodeId: "series-010e1",
    title: "Crimson Tide",
  },
  { seriesId: "series-012", episodeId: "series-012e1", title: "Wild Hearts" },
];
const NOVEL_TEST_FIRST_PARAGRAPH =
  "The first warning came as a color, not a sound.";

function buildReaderTestUrl(
  seriesId: string,
  episodeId: string,
  marker: string,
): string {
  return `/read/${seriesId}/${episodeId}?entry=${encodeURIComponent(marker)}`;
}

async function mockReaderRoutes(page, options: ReaderMockOptions = {}) {
  const pricePts = Number(options.pricePts ?? 0);
  const signedIn = options.signedIn ?? false;
  const unlockedEpisodeIds = Array.isArray(options.unlockedEpisodeIds)
    ? options.unlockedEpisodeIds
    : [];
  const seriesId = String(options.seriesId || "series-001");
  const episodeId = String(options.episodeId || `${seriesId}e1`);

  const seriesPayload = {
    ...baseSeriesPayload,
    ...(options.seriesPayload || {}),
    episodes: baseSeriesPayload.episodes.map((episode, index) => ({
      ...episode,
      id: index === 0 ? episodeId : episode.id,
      seriesId,
      pricePts: index === 0 ? pricePts : episode.pricePts,
    })),
  };

  const episodePayload = {
    episode: {
      id: episodeId,
      seriesId,
      title: "Episode 1",
      type: "comic",
      pricePts,
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
    ...(options.episodePayload || {}),
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
        body: JSON.stringify({
          name: "gush-backend",
          version: "0.1.0",
          commit: "test-commit",
        }),
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
          user: signedIn
            ? { id: "reader-001", email: "reader@example.com" }
            : null,
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

    if (pathname === `/api/series/${seriesId}`) {
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
            seriesId,
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
  for (const scenario of CLEAN_FREE_READER_SERIES) {
    test(`free reader ${scenario.seriesId} should hide status panel copy and wallet`, async ({
      page,
    }) => {
      const runtimeIssues = collectRuntimeIssues(page);
      await mockReaderRoutes(page, {
        seriesId: scenario.seriesId,
        episodeId: scenario.episodeId,
        seriesPayload: {
          series: {
            ...baseSeriesPayload.series,
            id: scenario.seriesId,
            title: scenario.title,
            type: "comic",
          },
        },
        episodePayload: {
          episode: {
            id: scenario.episodeId,
            seriesId: scenario.seriesId,
            title: "Episode 1",
            type: "comic",
            pricePts: 0,
            previewFreePages: 3,
            pages: [
              {
                url: createReaderPagePlaceholder(`${scenario.title} Ep1 P1`),
                w: 800,
                h: 1200,
              },
              {
                url: createReaderPagePlaceholder(`${scenario.title} Ep1 P2`),
                w: 800,
                h: 1200,
              },
              {
                url: createReaderPagePlaceholder(`${scenario.title} Ep1 P3`),
                w: 800,
                h: 1200,
              },
            ],
            paragraphs: [],
          },
        },
      });

      const response = await page.goto(
        `/read/${scenario.seriesId}/${scenario.episodeId}`,
        {
          waitUntil: "domcontentloaded",
        },
      );
      expect(response?.ok()).toBeTruthy();

      const body = page.locator("body");
      await expect(body).not.toContainText(
        /Current reader label|Core palette enabled|Access state|Full chapter open|No preview cap is active/i,
      );
      await expect(body).not.toContainText(
        /Reading mode|Wallet|0 pts|Sign in to sync points/i,
      );
      await expect(body).not.toContainText(
        /Story preview artwork|Reader fallback|Page preview|Installment/i,
      );

      await expectNoRuntimeIssues(
        `/read/${scenario.seriesId}/${scenario.episodeId}#free-clean`,
        runtimeIssues,
      );
    });
  }

  test("comic reader should avoid dashboard copy and keep an immersive image stage", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page);

    const response = await page.goto(
      buildReaderTestUrl(
        "series-001",
        "series-001e1",
        "comic-immersive-layout-test",
      ),
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    const body = page.locator("body");
    await expect(body).not.toContainText(
      /Reader deck|Live controls|Active reader|Reader console|Quick jumps|Next move|Preview checkpoint/i,
    );
    await expect(body).not.toContainText(
      /Preparing the reader surface|Story beat|Hook panel|Local QA artwork/i,
    );
    await expect(body).not.toContainText(
      /Current reader label|Core palette enabled|Access state|Full chapter open|No preview cap is active/i,
    );
    await expect(body).not.toContainText(
      /Reading mode|Wallet|0 pts|Sign in to sync points/i,
    );
    await expect(body).not.toContainText(
      /Story preview artwork|Reader fallback|Page preview/i,
    );

    const comicRegion = page.getByTestId("comic-reader-content");
    const shellMarker = page.getByTestId("comic-reader-shell-marker");
    const contentMarker = page.getByTestId("comic-reader-ssr-marker");
    await expect(comicRegion).toBeVisible();
    await expect(shellMarker).toBeAttached();
    await expect(contentMarker).toBeAttached();
    await expect(comicRegion).toHaveCSS("background-color", "rgb(5, 5, 5)");
    await expect(page.locator("main [data-index]").first()).toBeVisible();

    const metrics = await page.evaluate(() => {
      const container = document.querySelector(
        '[data-testid="comic-reader-content"]',
      ) as HTMLElement | null;
      const firstPage = document.querySelector(
        "main [data-index]",
      ) as HTMLElement | null;
      const firstImage = firstPage?.querySelector(
        "img",
      ) as HTMLImageElement | null;
      return {
        containerWidth: container?.getBoundingClientRect().width || 0,
        pageWidth: firstPage?.getBoundingClientRect().width || 0,
        imageWidth: firstImage?.getBoundingClientRect().width || 0,
        pageLeft: firstPage?.getBoundingClientRect().left || 0,
        viewportWidth: window.innerWidth,
      };
    });

    expect(metrics.containerWidth).toBeGreaterThan(0);
    expect(metrics.pageWidth).toBeGreaterThan(0);
    expect(metrics.imageWidth).toBeGreaterThan(0);
    expect(metrics.pageLeft).toBeGreaterThanOrEqual(0);
    expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);

    await expectNoRuntimeIssues(
      "/read/series-001/series-001e1#comic-immersive",
      runtimeIssues,
    );
  });

  test("legacy inline comic placeholders should render formal fallback pages instead of reader error copy", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page, {
      seriesId: "series-012",
      episodeId: "series-012e1",
      seriesPayload: {
        series: {
          ...baseSeriesPayload.series,
          id: "series-012",
          title: "Wild Hearts",
          type: "comic",
        },
      },
      episodePayload: {
        episode: {
          id: "series-012e1",
          seriesId: "series-012",
          title: "Episode 1",
          type: "comic",
          pricePts: 0,
          previewFreePages: 3,
          pages: [
            { url: createLegacyReaderMockPage("Wild Hearts"), w: 800, h: 1200 },
            { url: createLegacyReaderMockPage("Wild Hearts"), w: 800, h: 1200 },
            { url: createLegacyReaderMockPage("Wild Hearts"), w: 800, h: 1200 },
          ],
          paragraphs: [],
        },
      },
    });

    const response = await page.goto(
      buildReaderTestUrl(
        "series-012",
        "series-012e1",
        "legacy-fallback-image",
      ),
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    const body = page.locator("body");
    await expect(body).not.toContainText(
      /Comic reader content region|Comic page stream placeholder|Page unavailable|Tap to retry/i,
    );
    await expect(body).not.toContainText(
      /Story preview artwork|Reader fallback|Page preview/i,
    );

    const firstPageImage = page.locator("main [data-index='0'] img").first();
    await expect(firstPageImage).toBeVisible();
    await expect(firstPageImage).toHaveAttribute(
      "src",
      /\/images\/mock-comics\/series-012\/page-1\.svg/,
    );
    await expect(firstPageImage).toHaveAttribute(
      "alt",
      /Wild Hearts (Episode|Chapter) 1 page 1/i,
    );

    const order = await page.evaluate(() => {
      const content = document.querySelector(
        '[data-testid="comic-reader-content"]',
      ) as HTMLElement | null;
      const endPanel = document.querySelector(
        '[data-testid="reader-end-panel"]',
      ) as HTMLElement | null;
      return {
        contentTop: content?.getBoundingClientRect().top || 0,
        endPanelTop: endPanel?.getBoundingClientRect().top || 0,
      };
    });

    expect(order.contentTop).toBeLessThan(order.endPanelTop);

    await expectNoRuntimeIssues(
      "/read/series-012/series-012e1#legacy-fallback-image",
      runtimeIssues,
    );
  });

  test("healthy comic readers should render approved mock comic assets with descriptive alt text", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page, {
      seriesId: "series-001",
      episodeId: "series-001e1",
      seriesPayload: {
        series: {
          ...baseSeriesPayload.series,
          id: "series-001",
          title: "The Last Kingdom",
          type: "comic",
        },
      },
      episodePayload: {
        episode: {
          id: "series-001e1",
          seriesId: "series-001",
          title: "Episode 1",
          type: "comic",
          pricePts: 0,
          previewFreePages: 3,
          pages: [
            {
              url: "/images/mock-comics/series-001/page-1.svg",
              w: 800,
              h: 1200,
            },
            {
              url: "/images/mock-comics/series-001/page-2.svg",
              w: 800,
              h: 1200,
            },
            {
              url: "/images/mock-comics/series-001/page-3.svg",
              w: 800,
              h: 1200,
            },
          ],
          paragraphs: [],
        },
      },
    });

    const response = await page.goto(
      buildReaderTestUrl(
        "series-001",
        "series-001e1",
        "approved-mock-assets",
      ),
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    const firstImage = page.locator("main [data-index='0'] img").first();
    await expect(firstImage).toBeVisible();
    await expect(firstImage).toHaveAttribute(
      "src",
      /\/images\/mock-comics\/series-001\/page-1\.svg/,
    );
    await expect(firstImage).toHaveAttribute(
      "alt",
      /The Last Kingdom (Episode|Chapter) 1 page 1/i,
    );
    await expect(firstImage).not.toHaveAttribute("alt", /^Comic page$/i);

    await expectNoRuntimeIssues(
      "/read/series-001/series-001e1#approved-mock-assets",
      runtimeIssues,
    );
  });

  test("series-010 comic reader should render approved mock assets instead of error fallback copy", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page, {
      seriesId: "series-010",
      episodeId: "series-010e1",
      seriesPayload: {
        series: {
          ...baseSeriesPayload.series,
          id: "series-010",
          title: "Crimson Tide",
          type: "comic",
        },
      },
      episodePayload: {
        episode: {
          id: "series-010e1",
          seriesId: "series-010",
          title: "Episode 1",
          type: "comic",
          pricePts: 0,
          previewFreePages: 3,
          pages: [
            {
              url: "/images/mock-comics/series-010/page-1.svg",
              w: 800,
              h: 1200,
            },
            {
              url: "/images/mock-comics/series-010/page-2.svg",
              w: 800,
              h: 1200,
            },
            {
              url: "/images/mock-comics/series-010/page-3.svg",
              w: 800,
              h: 1200,
            },
          ],
          paragraphs: [],
        },
      },
    });

    const response = await page.goto(
      buildReaderTestUrl(
        "series-010",
        "series-010e1",
        "series-010-approved-assets",
      ),
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    const body = page.locator("body");
    await expect(body).not.toContainText(
      /Comic reader content region|Comic page stream placeholder|Page unavailable|Tap to retry/i,
    );
    await expect(body).not.toContainText(
      /Story preview artwork|Reader fallback|Page preview/i,
    );

    const firstImage = page.locator("main [data-index='0'] img").first();
    await expect(firstImage).toBeVisible();
    await expect(firstImage).toHaveAttribute(
      "src",
      /\/images\/mock-comics\/series-010\/page-1\.svg/,
    );
    await expect(firstImage).not.toHaveAttribute(
      "src",
      /\/fallback\/reader-page-default\.svg/,
    );
    await expect(firstImage).toHaveAttribute(
      "alt",
      /Crimson Tide (Episode|Chapter) 1 page 1/i,
    );
    await expect(firstImage).not.toHaveAttribute("alt", /^Comic page$/i);

    const order = await page.evaluate(() => {
      const content = document.querySelector(
        '[data-testid="comic-reader-content"]',
      ) as HTMLElement | null;
      const endPanel = document.querySelector(
        '[data-testid="reader-end-panel"]',
      ) as HTMLElement | null;
      return {
        contentTop: content?.getBoundingClientRect().top || 0,
        endPanelTop: endPanel?.getBoundingClientRect().top || 0,
      };
    });

    expect(order.contentTop).toBeLessThan(order.endPanelTop);

    await expectNoRuntimeIssues(
      "/read/series-010/series-010e1#approved-mock-assets",
      runtimeIssues,
    );
  });

  test("novel reader should keep visible prose for series-011", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page, {
      seriesId: NOVEL_TEST_SERIES_ID,
      episodeId: NOVEL_TEST_EPISODE_ID,
      seriesPayload: {
        series: {
          ...baseSeriesPayload.series,
          id: NOVEL_TEST_SERIES_ID,
          title: NOVEL_TEST_TITLE,
          type: "novel",
        },
      },
      episodePayload: {
        episode: {
          id: NOVEL_TEST_EPISODE_ID,
          seriesId: NOVEL_TEST_SERIES_ID,
          title: "Episode 1",
          type: "novel",
          pricePts: 0,
          previewFreePages: 0,
          pages: [],
          paragraphs: [
            NOVEL_TEST_FIRST_PARAGRAPH,
            "The relay hum settles into the cabin while the crew weighs what to risk next.",
            "By the end of the chapter, the choice feels inevitable instead of forced.",
          ],
        },
      },
    });

    const response = await page.goto(
      `/read/${NOVEL_TEST_SERIES_ID}/${NOVEL_TEST_EPISODE_ID}`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    const novelRegion = page.getByTestId("novel-reader-content");
    await expect(novelRegion).toBeVisible();
    await expect(novelRegion).toContainText(NOVEL_TEST_FIRST_PARAGRAPH);
    await expect(page.locator("body")).not.toContainText(
      /Page unavailable|Tap to retry|Comic page/i,
    );

    await expectNoRuntimeIssues(
      `/read/${NOVEL_TEST_SERIES_ID}/${NOVEL_TEST_EPISODE_ID}#novel-visible-prose`,
      runtimeIssues,
    );
  });

  test("mobile reader should keep a stable first paint, open settings, and avoid horizontal overflow", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page);

    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto(
      buildReaderTestUrl(
        "series-001",
        "series-001e1",
        "mobile-reader-layout",
      ),
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    const topBarHeading = page.getByRole("heading", {
      name: "The Last Kingdom",
      exact: true,
    });
    const settingsButton = page
      .getByRole("button", { name: "Reader Settings" })
      .first();
    await expect(topBarHeading).toBeVisible();
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    await expect(page.getByLabel("Reader settings sheet")).toBeVisible();
    await expect(page.locator("main [data-index]").first()).toBeVisible();

    const layout = await page.evaluate(() => {
      const wrappers = Array.from(
        document.querySelectorAll("main [data-index]"),
      );
      return wrappers.map((wrapper) => {
        const element = wrapper as HTMLElement;
        const image = element.querySelector("img") as HTMLImageElement | null;
        return {
          offsetTop: element.offsetTop,
          offsetHeight: element.offsetHeight,
          imageHeight: image ? image.clientHeight : 0,
          imageWidth: image ? image.clientWidth : 0,
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
      expect(item.imageWidth).toBeGreaterThan(0);
    }

    await expectNoBasicA11yAuditIssues(page, "/read/series-001/series-001e1", {
      ignoreImagesInside: ["main [data-index]"],
    });
    await expectNoRuntimeIssues("/read/series-001/series-001e1", runtimeIssues);
  });

  test("reader actions should save and remove a bookmark without crashing", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page, { signedIn: true });

    const response = await page.goto(
      buildReaderTestUrl("series-001", "series-001e1", "bookmark-actions"),
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    const topBarHeading = page.getByRole("heading", {
      name: "The Last Kingdom",
      exact: true,
    });
    await expect(topBarHeading).toBeVisible();
    const settingsButton = page.getByRole("button", {
      name: "Reader Settings",
    });
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    const saveProgressAction = page.getByRole("button", {
      name: /Save progress/i,
    });
    await expect(saveProgressAction).toBeVisible();
    await saveProgressAction.click();
    await expect(page.getByText("Bookmark saved")).toBeVisible();

    await settingsButton.click();
    await expect(saveProgressAction).toBeVisible();
    await saveProgressAction.click();
    await expect(page.getByText("Bookmark removed")).toBeVisible();

    await expectNoRuntimeIssues(
      "/read/series-001/series-001e1#bookmarks",
      runtimeIssues,
    );
  });

  test("locked reader should render the unlock card without crashing", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page, {
      seriesId: LOCKED_TEST_SERIES_ID,
      episodeId: LOCKED_TEST_EPISODE_ID,
      pricePts: 24,
    });

    const response = await page.goto(
      `/read/${LOCKED_TEST_SERIES_ID}/${LOCKED_TEST_EPISODE_ID}`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByText(/Preview ends here|Unlock the rest of this/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/Wallet total/i).first()).toBeVisible();
    await expect(page.getByText(/\d+\s*pts/i).first()).toBeVisible();
    await expect(
      page
        .getByRole("button", {
          name: /Sign in to unlock|Add Points|Unlock with \d+ pts/i,
        })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /View Series/i }).first(),
    ).toBeVisible();

    await expectNoRuntimeIssues(
      `/read/${LOCKED_TEST_SERIES_ID}/${LOCKED_TEST_EPISODE_ID}#unlock`,
      runtimeIssues,
    );
  });

  test("novel reader should keep prose centered, open settings, and keep comments after the story", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page, {
      seriesId: NOVEL_TEST_SERIES_ID,
      episodeId: NOVEL_TEST_EPISODE_ID,
      seriesPayload: {
        series: {
          ...baseSeriesPayload.series,
          id: NOVEL_TEST_SERIES_ID,
          type: "novel",
          title: NOVEL_TEST_TITLE,
        },
      },
      episodePayload: {
        episode: {
          id: NOVEL_TEST_EPISODE_ID,
          seriesId: NOVEL_TEST_SERIES_ID,
          title: "Episode 1",
          type: "novel",
          pricePts: 0,
          previewFreePages: 0,
          pages: [],
          paragraphs: [
            NOVEL_TEST_FIRST_PARAGRAPH,
            "Every loose screw in the console hummed in the same key, and the bridge suddenly felt too small for what was looking back at them.",
            "Outside the hull, the storm leaned against the ship like it knew the route better than the crew did.",
            "On Lena's console, the message stopped sounding like a distress call and started sounding like a warning sent too late.",
          ],
        },
      },
    });

    await page.setViewportSize({ width: 430, height: 932 });

    const response = await page.goto(
      `/read/${NOVEL_TEST_SERIES_ID}/${NOVEL_TEST_EPISODE_ID}`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("main [data-index='0']")).toBeVisible();

    const settingsButton = page
      .getByRole("button", { name: "Reader Settings" })
      .first();
    await settingsButton.click();
    await expect(
      page.getByRole("heading", { name: "Reading settings" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sepia" })).toBeVisible();

    const paragraphCount = await page.locator("main [data-index]").count();
    expect(paragraphCount).toBeGreaterThanOrEqual(4);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const positions = await page.evaluate(() => {
      const firstParagraph = document.querySelector(
        "main [data-index='0']",
      ) as HTMLElement | null;
      const commentsRegion = document.querySelector(
        '[data-testid="reader-reactions"]',
      ) as HTMLElement | null;

      return {
        paragraphWidth: firstParagraph?.getBoundingClientRect().width || 0,
        paragraphLeft: firstParagraph?.getBoundingClientRect().left || 0,
        paragraphRight: firstParagraph?.getBoundingClientRect().right || 0,
        viewportWidth: window.innerWidth,
        commentsTop: commentsRegion?.getBoundingClientRect().top || 0,
        paragraphTop: firstParagraph?.getBoundingClientRect().top || 0,
      };
    });

    expect(positions.paragraphWidth).toBeGreaterThan(240);
    expect(positions.paragraphWidth).toBeLessThan(760);
    expect(positions.paragraphLeft).toBeGreaterThanOrEqual(12);
    expect(positions.paragraphRight).toBeLessThanOrEqual(
      positions.viewportWidth - 12,
    );
    expect(positions.commentsTop).toBeGreaterThan(positions.paragraphTop + 120);

    await expectNoRuntimeIssues(
      `/read/${NOVEL_TEST_SERIES_ID}/${NOVEL_TEST_EPISODE_ID}#novel`,
      runtimeIssues,
    );
  });

  test("novel reader should avoid dashboard copy, keep a readable column, and let settings close cleanly", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page, {
      seriesId: NOVEL_TEST_SERIES_ID,
      episodeId: NOVEL_TEST_EPISODE_ID,
      seriesPayload: {
        series: {
          ...baseSeriesPayload.series,
          id: NOVEL_TEST_SERIES_ID,
          type: "novel",
          title: NOVEL_TEST_TITLE,
        },
      },
      episodePayload: {
        episode: {
          id: NOVEL_TEST_EPISODE_ID,
          seriesId: NOVEL_TEST_SERIES_ID,
          title: "Episode 1",
          type: "novel",
          pricePts: 0,
          previewFreePages: 0,
          pages: [],
          paragraphs: [
            NOVEL_TEST_FIRST_PARAGRAPH,
            "Every loose screw in the console hummed in the same key, and the bridge suddenly felt too small for what was looking back at them.",
            "Outside the hull, the storm leaned against the ship like it knew the route better than the crew did.",
          ],
        },
      },
    });

    const response = await page.goto(
      `/read/${NOVEL_TEST_SERIES_ID}/${NOVEL_TEST_EPISODE_ID}`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("body")).not.toContainText(
      /Reader deck|Live controls|Active reader|Reader console|Quick jumps|Next move|Preview checkpoint/i,
    );
    await expect(page.locator("body")).not.toContainText(
      /Preparing the reader surface|Story beat|Hook panel|Local QA artwork/i,
    );

    const novelRegion = page.getByTestId("novel-reader-content");
    await expect(novelRegion).toBeVisible();
    await expect(novelRegion).toHaveAttribute(
      "data-reader-theme",
      /light|sepia|dark/,
    );

    const settingsButton = page.getByRole("button", {
      name: "Reader Settings",
    });
    await expect(settingsButton.first()).toBeVisible();
    await settingsButton.first().click();

    const settingsSheet = page.getByLabel("Reader settings sheet");
    await expect(settingsSheet).toBeVisible();
    await page.getByRole("button", { name: "Sepia" }).click();
    await page.getByRole("button", { name: "Dark" }).click();
    await page.getByLabel("Close settings").click();
    await expect(settingsSheet).toBeHidden();

    const proseMetrics = await page.evaluate(() => {
      const container = document.querySelector(
        '[data-testid="novel-reader-content"]',
      ) as HTMLElement | null;
      const paragraph = document.querySelector(
        "main [data-index='0']",
      ) as HTMLElement | null;
      const paragraphStyle = paragraph
        ? window.getComputedStyle(paragraph)
        : null;
      return {
        containerWidth: container?.getBoundingClientRect().width || 0,
        fontSize: paragraphStyle?.fontSize || "",
        lineHeight: paragraphStyle?.lineHeight || "",
      };
    });

    expect(proseMetrics.containerWidth).toBeGreaterThan(320);
    expect(proseMetrics.containerWidth).toBeLessThanOrEqual(760);
    expect(Number.parseFloat(proseMetrics.fontSize)).toBeGreaterThanOrEqual(16);
    expect(Number.parseFloat(proseMetrics.lineHeight)).toBeGreaterThan(24);

    await expectNoRuntimeIssues(
      `/read/${NOVEL_TEST_SERIES_ID}/${NOVEL_TEST_EPISODE_ID}#novel-column`,
      runtimeIssues,
    );
  });

  test("reader settings should open, update controls, and close without crashing", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page, {
      seriesId: NOVEL_TEST_SERIES_ID,
      episodeId: NOVEL_TEST_EPISODE_ID,
      seriesPayload: {
        series: {
          ...baseSeriesPayload.series,
          id: NOVEL_TEST_SERIES_ID,
          type: "novel",
          title: NOVEL_TEST_TITLE,
        },
      },
      episodePayload: {
        episode: {
          id: NOVEL_TEST_EPISODE_ID,
          seriesId: NOVEL_TEST_SERIES_ID,
          title: "Episode 1",
          type: "novel",
          pricePts: 0,
          previewFreePages: 0,
          pages: [],
          paragraphs: [
            NOVEL_TEST_FIRST_PARAGRAPH,
            "Every loose screw in the console hummed in the same key, and the bridge suddenly felt too small for what was looking back at them.",
          ],
        },
      },
    });

    const response = await page.goto(
      `/read/${NOVEL_TEST_SERIES_ID}/${NOVEL_TEST_EPISODE_ID}`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    await page.getByRole("button", { name: "Reader Settings" }).first().click();
    const sheet = page.getByLabel("Reader settings sheet");
    await expect(sheet).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Reading settings" }),
    ).toBeVisible();

    const sliders = page.locator('input[type="range"]');
    await expect(sliders).toHaveCount(3);
    await sliders.nth(0).fill("20");
    await sliders.nth(1).fill("1.9");
    await sliders.nth(2).fill("110");

    await page
      .getByRole("button", { name: "Reset defaults", exact: true })
      .click();
    await page.getByLabel("Close settings").click();
    await expect(sheet).toBeHidden();

    await expectNoRuntimeIssues(
      `/read/${NOVEL_TEST_SERIES_ID}/${NOVEL_TEST_EPISODE_ID}#settings`,
      runtimeIssues,
    );
  });

  test("comic reader settings should open and layout toggle should stay stable", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page);

    const response = await page.goto(
      buildReaderTestUrl("series-001", "series-001e1", "comic-settings"),
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    await page.getByRole("button", { name: "Reader Settings" }).first().click();
    const sheet = page.getByLabel("Reader settings sheet");
    await expect(sheet).toBeVisible();
    await expect(page.getByText("Comic settings")).toBeVisible();

    const verticalButton = page.getByRole("button", { name: "Vertical" });
    const horizontalButton = page.getByRole("button", { name: "Horizontal" });
    await expect(verticalButton).toBeVisible();
    await expect(horizontalButton).toBeVisible();

    await horizontalButton.click();
    await verticalButton.click();
    await page.getByLabel("Close settings").click();
    await expect(sheet).toBeHidden();

    await expectNoRuntimeIssues(
      "/read/series-001/series-001e1#comic-settings",
      runtimeIssues,
    );
  });

  test("reader end panel should appear after content and keep discussion below the story", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockReaderRoutes(page);

    const response = await page.goto(
      buildReaderTestUrl("series-001", "series-001e1", "end-panel-order"),
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const endPanel = page.getByTestId("reader-end-panel");
    const shellMarker = page.getByTestId("comic-reader-shell-marker");
    const contentMarker = page.getByTestId("comic-reader-ssr-marker");
    await expect(endPanel).toBeVisible();
    await expect(shellMarker).toBeAttached();
    await expect(contentMarker).toBeAttached();
    await expect(endPanel).toContainText("Chapter Complete");
    await expect(
      endPanel
        .getByRole("button", { name: /Next chapter|View Series/i })
        .first(),
    ).toBeVisible();
    await expect(
      endPanel
        .getByRole("button", { name: /Previous chapter|View Series/i })
        .first(),
    ).toBeVisible();

    const order = await page.evaluate(() => {
      const lastContent = Array.from(
        document.querySelectorAll("main [data-index]"),
      ).at(-1) as HTMLElement | undefined;
      const shellMarker = document.querySelector(
        '[data-testid="comic-reader-shell-marker"]',
      ) as HTMLElement | null;
      const contentMarker = document.querySelector(
        '[data-testid="comic-reader-ssr-marker"]',
      ) as HTMLElement | null;
      const endPanelNode = document.querySelector(
        '[data-testid="reader-end-panel"]',
      ) as HTMLElement | null;
      const commentsRegion = document.querySelector(
        '[data-testid="reader-reactions"]',
      ) as HTMLElement | null;
      const documentTop = window.scrollY;
      return {
        shellMarkerTop:
          (shellMarker?.getBoundingClientRect().top || 0) + documentTop,
        markerTop:
          (contentMarker?.getBoundingClientRect().top || 0) + documentTop,
        lastContentBottom:
          (lastContent?.getBoundingClientRect().bottom || 0) + documentTop,
        endPanelTop:
          (endPanelNode?.getBoundingClientRect().top || 0) + documentTop,
        commentsTop:
          (commentsRegion?.getBoundingClientRect().top || 0) + documentTop,
      };
    });

    expect(order.shellMarkerTop).toBeLessThan(order.endPanelTop);
    expect(order.markerTop).toBeLessThan(order.endPanelTop);
    expect(order.endPanelTop).toBeGreaterThan(order.lastContentBottom - 200);
    expect(order.commentsTop).toBeGreaterThan(order.endPanelTop);

    await expectNoRuntimeIssues(
      "/read/series-001/series-001e1#end-panel",
      runtimeIssues,
    );
  });

  test("reader controls should expose accessible names", async ({ page }) => {
    await mockReaderRoutes(page);

    const response = await page.goto(
      buildReaderTestUrl("series-001", "series-001e1", "reader-controls-a11y"),
      {
        waitUntil: "domcontentloaded",
      },
    );
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("button", { name: "Back", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reader Settings" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Previous/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Next/i }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Reader Settings" }).first().click();
    await expect(page.getByLabel("Close settings")).toBeVisible();
  });
});
