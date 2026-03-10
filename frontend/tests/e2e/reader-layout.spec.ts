import { expect, test } from "@playwright/test";

const seriesPayload = {
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
    { id: "series-001e1", seriesId: "series-001", number: 1, title: "Episode 1", pricePts: 0, previewFreePages: 3, ttfEligible: false },
    { id: "series-001e2", seriesId: "series-001", number: 2, title: "Episode 2", pricePts: 0, previewFreePages: 3, ttfEligible: false },
    { id: "series-001e3", seriesId: "series-001", number: 3, title: "Episode 3", pricePts: 0, previewFreePages: 3, ttfEligible: false },
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
      { url: "https://placehold.co/800x1200/1a1a2e/ffffff.png?text=The+Last+Kingdom+Ep1+P1", w: 800, h: 1200 },
      { url: "https://placehold.co/800x1200/1a1a2e/ffffff.png?text=The+Last+Kingdom+Ep1+P2", w: 800, h: 1200 },
      { url: "https://placehold.co/800x1200/1a1a2e/ffffff.png?text=The+Last+Kingdom+Ep1+P3", w: 800, h: 1200 },
    ],
    paragraphs: [],
  },
};

test.describe("Reader layout", () => {
  test("mobile vertical reader should stack comic pages without content-visibility placeholders", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;

      if (pathname === "/api/health" || pathname === "/api/health/ready" || pathname === "/api/health/live") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, dbOk: true }) });
        return;
      }

      if (pathname === "/api/meta/version") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ name: "gush-backend", version: "0.1.0", commit: "test-commit" }) });
        return;
      }

      if (pathname === "/api/regions/config") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ regions: [], defaultRegion: "US" }) });
        return;
      }

      if (pathname === "/api/auth/me") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: null }) });
        return;
      }

      if (pathname === "/api/preferences") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ adult: false, autoplay: false }) });
        return;
      }

      if (pathname === "/api/episode") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(episodePayload) });
        return;
      }

      if (pathname === "/api/series/series-001") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(seriesPayload) });
        return;
      }

      if (pathname === "/api/events/batch") {
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) });
        return;
      }

      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    });

    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/read/series-001/series-001e1", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await page.getByText("Episode 1").first().waitFor({ state: "visible" });
    await page.waitForTimeout(1200);

    const layout = await page.evaluate(() => {
      const wrappers = Array.from(document.querySelectorAll("main [data-index]"));
      return wrappers.map((wrapper) => {
        const element = wrapper as HTMLElement;
        const image = element.querySelector("img") as HTMLImageElement | null;
        return {
          contentVisibility: element.style.contentVisibility || "",
          containIntrinsicSize: element.style.containIntrinsicSize || "",
          offsetTop: element.offsetTop,
          offsetHeight: element.offsetHeight,
          imageHeight: image ? image.clientHeight : 0,
        };
      });
    });

    expect(layout.length).toBeGreaterThanOrEqual(3);

    for (const item of layout) {
      expect(item.contentVisibility).toBe("");
      expect(item.containIntrinsicSize).toBe("");
      expect(item.offsetHeight).toBeGreaterThan(0);
      expect(item.imageHeight).toBeGreaterThan(0);
    }

    for (let index = 1; index < layout.length; index += 1) {
      const previous = layout[index - 1];
      const current = layout[index];
      const gap = current.offsetTop - (previous.offsetTop + previous.offsetHeight);
      expect(gap).toBeLessThanOrEqual(1);
      expect(gap).toBeGreaterThanOrEqual(-1);
    }
  });
});
