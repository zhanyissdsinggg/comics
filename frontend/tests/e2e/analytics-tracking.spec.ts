import { expect, test, type Page } from "@playwright/test";
import { createReaderPagePlaceholder } from "./support/placeholders";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

type CapturedEvent = {
  event: string;
  legacyEvent?: string;
  props?: Record<string, unknown>;
};

function buildTrackingConfig(values: Record<string, unknown>) {
  return JSON.stringify({
    savedAt: "2026-05-11T00:00:00.000Z",
    values,
  });
}

async function captureAnalyticsBatches(page: Page) {
  const capturedEvents: CapturedEvent[] = [];

  await page.route("**/api/events/batch", async (route) => {
    const payload = route.request().postDataJSON() as {
      events?: CapturedEvent[];
    };
    capturedEvents.push(
      ...(Array.isArray(payload?.events) ? payload.events : []),
    );
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  return capturedEvents;
}

async function flushAnalytics(page: Page, capturedEvents: CapturedEvent[]) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("beforeunload"));
  });

  await expect
    .poll(() => capturedEvents.length, { timeout: 10000 })
    .toBeGreaterThan(0);
}

async function mockSharedApiRoutes(
  page: Page,
  options: {
    signedIn?: boolean;
    trackingValues?: Record<string, unknown>;
    seriesByAdultFlag?: Record<string, unknown[]>;
  } = {},
) {
  const signedIn = options.signedIn ?? false;
  const trackingValues = options.trackingValues ?? {};
  const seriesByAdultFlag = options.seriesByAdultFlag ?? { "0": [], "1": [] };

  await page.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const adultFlag = requestUrl.searchParams.get("adult") || "0";

    if (pathname === "/api/events/batch") {
      await route.fallback();
      return;
    }

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

    if (pathname === "/api/tracking") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          config: {
            values: trackingValues,
          },
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
            matureModeEnabled: adultFlag === "1",
            matureVerification: {
              verified: true,
              provider: "local-gate",
              region: "global",
              expiresAt: null,
              referenceId: null,
              verifiedAt: "2026-05-11T00:00:00.000Z",
            },
          },
        }),
      });
      return;
    }

    if (pathname === "/api/search/hot") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ keywords: ["Midnight", "Romance", "Thriller"] }),
      });
      return;
    }

    if (pathname === "/api/search") {
      const query = (requestUrl.searchParams.get("q") || "")
        .trim()
        .toLowerCase();
      const results =
        query === "midnight heat"
          ? [
              {
                id: adultFlag === "1" ? "adult-001" : "series-001",
                title: adultFlag === "1" ? "After Hours" : "Midnight Heat",
                type: "comic",
                author: "Vale After Dark",
                description: "Late-night thriller in the city.",
                adult: adultFlag === "1",
                genres:
                  adultFlag === "1" ? ["Mature", "Thriller"] : ["Thriller"],
                coverUrl: createReaderPagePlaceholder("Search Cover"),
                rating: 4.8,
                viewsText: "12K",
                viewsValue: 12000,
                latestEpisodeId:
                  adultFlag === "1" ? "adult-001e1" : "series-001e1",
                firstEpisodeId:
                  adultFlag === "1" ? "adult-001e1" : "series-001e1",
                episodeCount: 8,
                status: "UP",
              },
            ]
          : [];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results,
          total: results.length,
        }),
      });
      return;
    }

    if (pathname === "/api/series") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          series: seriesByAdultFlag[adultFlag] || [],
        }),
      });
      return;
    }

    if (pathname === "/api/rankings") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rankings: seriesByAdultFlag[adultFlag] || [],
        }),
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

type ReaderMockOptions = {
  seriesId?: string;
  episodeId?: string;
  signedIn?: boolean;
  adult?: boolean;
};

async function mockReaderApiRoutes(
  page: Page,
  options: ReaderMockOptions = {},
) {
  const seriesId = options.seriesId || "series-001";
  const episodeId = options.episodeId || `${seriesId}e1`;
  const signedIn = options.signedIn ?? false;
  const adult = options.adult ?? false;

  await page.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;

    if (pathname === "/api/events/batch") {
      await route.fallback();
      return;
    }

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

    if (pathname === "/api/tracking") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ config: { values: {} } }),
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
            matureModeEnabled: false,
            matureVerification: {
              verified: true,
              provider: "local-gate",
              region: "global",
              expiresAt: null,
              referenceId: null,
              verifiedAt: "2026-05-11T00:00:00.000Z",
            },
          },
        }),
      });
      return;
    }

    if (pathname === `/api/series/${seriesId}`) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          series: {
            id: seriesId,
            title: adult ? "After Hours" : "The Last Kingdom",
            type: "comic",
            adult,
            status: "Ongoing",
            description: "Mocked reader series.",
          },
          episodes: [
            {
              id: `${seriesId}e1`,
              seriesId,
              number: 1,
              title: "Episode 1",
              adult,
              pricePts: 0,
              previewFreePages: 3,
            },
            {
              id: `${seriesId}e2`,
              seriesId,
              number: 2,
              title: "Episode 2",
              adult,
              pricePts: 0,
              previewFreePages: 3,
            },
            {
              id: `${seriesId}e3`,
              seriesId,
              number: 3,
              title: "Episode 3",
              adult,
              pricePts: 0,
              previewFreePages: 3,
            },
          ],
        }),
      });
      return;
    }

    if (pathname === "/api/episode") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          episode: {
            id: episodeId,
            seriesId,
            title: "Episode 1",
            type: "comic",
            adult,
            pricePts: 0,
            previewFreePages: 3,
            pages: [
              {
                url: createReaderPagePlaceholder("Reader P1"),
                w: 800,
                h: 1200,
              },
              {
                url: createReaderPagePlaceholder("Reader P2"),
                w: 800,
                h: 1200,
              },
              {
                url: createReaderPagePlaceholder("Reader P3"),
                w: 800,
                h: 1200,
              },
            ],
            paragraphs: [],
          },
        }),
      });
      return;
    }

    if (pathname === "/api/wallet") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          wallet: {
            paidPts: 120,
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
            unlockedEpisodeIds: [episodeId],
          },
        }),
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

test.describe("Analytics tracking", () => {
  test("search analytics should tolerate missing GA4/Snap and avoid leaking the raw query", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    const capturedEvents = await captureAnalyticsBatches(page);

    await mockSharedApiRoutes(page, {
      seriesByAdultFlag: {
        "0": [
          {
            id: "series-001",
            title: "Midnight Heat",
            type: "comic",
            adult: false,
            author: "Vale After Dark",
            description: "Late-night thriller in the city.",
            genres: ["Thriller"],
            coverUrl: createReaderPagePlaceholder("Home Cover"),
            rating: 4.8,
            viewsText: "12K",
            viewsValue: 12000,
            latestEpisodeId: "series-001e1",
            firstEpisodeId: "series-001e1",
            episodeCount: 8,
            status: "UP",
          },
        ],
      },
    });

    const response = await page.goto("/search", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const searchInput = page.getByPlaceholder(
      "Search titles, creators, or genres...",
    );
    await expect(searchInput).toBeVisible();
    await searchInput.fill("midnight heat");
    await expect(page.getByText("Midnight Heat").first()).toBeVisible();

    await flushAnalytics(page, capturedEvents);

    const searchSubmit = capturedEvents.find(
      (event) => event.event === "search_submit",
    );
    expect(searchSubmit).toBeTruthy();
    expect(searchSubmit?.props?.has_query).toBe(true);
    expect(searchSubmit?.props?.query_length).toBe(13);
    expect(searchSubmit?.props).not.toHaveProperty("query");
    expect(searchSubmit?.props).not.toHaveProperty("q");

    await expectNoRuntimeIssues("/search", runtimeIssues);
  });

  test("adult mode toggle should emit content-mode events and stay compatible with GA4/Snap adapters", async ({
    page,
    context,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    const trackedConfig = {
      google: {
        measurementId: "G-TEST123",
        adsConversionId: "AW-TEST123",
      },
      snapchat: {
        pixelId: "SNAP-PIXEL-123",
      },
    };
    const capturedEvents = await captureAnalyticsBatches(page);

    await context.addCookies([
      {
        name: "mn_is_signed_in",
        value: "1",
        url: "http://127.0.0.1:4173",
      },
    ]);

    await page.addInitScript(
      ({ trackingConfigRaw }) => {
        window.__gtagCalls = [];
        window.__snaptrCalls = [];
        window.gtag = (...args) => {
          window.__gtagCalls.push(args);
        };
        window.snaptr = (...args) => {
          window.__snaptrCalls.push(args);
        };
        window.__mnGoogleTagScriptLoaded = true;
        window.__mnSnapPixelScriptLoaded = true;
        window.localStorage.setItem("mn_region", "global");
        window.localStorage.setItem("mn_adult_confirmed", "1");
        window.localStorage.setItem("mn_age_rule", "global");
        window.localStorage.setItem("mn_adult_mode", "0");
        window.localStorage.setItem(
          "mn_mature_verification",
          JSON.stringify({
            verified: true,
            provider: "local-gate",
            region: "global",
            expiresAt: null,
            referenceId: null,
            verifiedAt: "2026-05-11T00:00:00.000Z",
          }),
        );
        window.localStorage.setItem(
          "mn_tracking_settings_v1",
          trackingConfigRaw,
        );
      },
      {
        trackingConfigRaw: buildTrackingConfig(trackedConfig),
      },
    );

    await mockSharedApiRoutes(page, {
      signedIn: true,
      trackingValues: trackedConfig,
      seriesByAdultFlag: {
        "0": [
          {
            id: "series-001",
            title: "Midnight Heat",
            type: "comic",
            adult: false,
            author: "Vale After Dark",
            description: "Late-night thriller in the city.",
            genres: ["Thriller"],
            coverUrl: createReaderPagePlaceholder("Normal Cover"),
            rating: 4.8,
            viewsText: "12K",
            viewsValue: 12000,
            latestEpisodeId: "series-001e1",
            firstEpisodeId: "series-001e1",
            episodeCount: 8,
            status: "UP",
          },
        ],
        "1": [
          {
            id: "adult-001",
            title: "After Hours",
            type: "comic",
            adult: true,
            author: "Vale After Dark",
            description: "Adult thriller catalogue.",
            genres: ["Mature", "Thriller"],
            coverUrl: createReaderPagePlaceholder("Adult Cover"),
            rating: 4.9,
            viewsText: "18K",
            viewsValue: 18000,
            latestEpisodeId: "adult-001e1",
            firstEpisodeId: "adult-001e1",
            episodeCount: 6,
            status: "HOT",
          },
        ],
      },
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const adultToggle = page
      .getByRole("button", { name: /Enter 18\+ mode|18\+/i })
      .first();
    await expect(adultToggle).toBeVisible();
    await adultToggle.click();

    await flushAnalytics(page, capturedEvents);

    const contentModeEvent = capturedEvents.find(
      (event) => event.event === "content_mode_enter_adult",
    );
    expect(contentModeEvent).toBeTruthy();
    expect(contentModeEvent?.props?.content_mode).toBe("adult");

    const gtagCalls = await page.evaluate(() => window.__gtagCalls);
    expect(
      gtagCalls.some(
        (entry) =>
          entry[0] === "event" && entry[1] === "content_mode_enter_adult",
      ),
    ).toBe(true);

    const snaptrCalls = await page.evaluate(() => window.__snaptrCalls);
    expect(
      snaptrCalls.some(
        (entry) => entry[0] === "init" && entry[1] === "SNAP-PIXEL-123",
      ),
    ).toBe(true);

    await expectNoRuntimeIssues("/", runtimeIssues);
  });

  test("reader progress should report milestones once even after repeated scrolling", async ({
    page,
  }) => {
    const capturedEvents = await captureAnalyticsBatches(page);
    await mockReaderApiRoutes(page, {
      signedIn: true,
      adult: false,
    });

    const response = await page.goto("/read/series-001/series-001e1", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText("The Last Kingdom").first()).toBeVisible();

    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" }),
    );
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
    await page.waitForTimeout(300);
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" }),
    );

    await flushAnalytics(page, capturedEvents);

    const progressEvents = capturedEvents.filter(
      (event) => event.event === "episode_progress",
    );
    const milestones = progressEvents.map((event) =>
      Number(event.props?.milestone || 0),
    );

    expect(milestones.length).toBeGreaterThan(0);
    expect(new Set(milestones).size).toBe(milestones.length);
  });

  test("adult reader blocked events should stay sanitized", async ({
    page,
  }) => {
    const capturedEvents = await captureAnalyticsBatches(page);
    await mockReaderApiRoutes(page, {
      seriesId: "series-013",
      episodeId: "series-013e1",
      signedIn: true,
      adult: true,
    });

    const response = await page.goto("/read/series-013/series-013e1", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByText(/Adult mode required|Confirm your age|Enable adult mode/i),
    ).toBeVisible();
    await flushAnalytics(page, capturedEvents);

    const blockedEvent = capturedEvents.find(
      (event) => event.event === "adult_reader_blocked",
    );
    expect(blockedEvent).toBeTruthy();
    expect(blockedEvent?.props?.is_adult).toBe(true);
    expect(blockedEvent?.props).not.toHaveProperty("title");
    expect(blockedEvent?.props).not.toHaveProperty("series_title");
    expect(blockedEvent?.props).not.toHaveProperty("episode_title");
    expect(blockedEvent?.props).not.toHaveProperty("query");
  });
});
