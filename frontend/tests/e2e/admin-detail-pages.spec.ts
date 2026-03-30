import { expect, test, type Page, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const ADMIN_UI_TIMEOUT_MS = 15000;

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function primeAdminSession(page: Page): Promise<void> {
  await page.addInitScript(() => undefined);
}

async function installAdminBaseMocks(page: Page): Promise<void> {
  await page.route("**/api/health", async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route("**/api/admin/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname.endsWith("/api/admin/auth/verify")) {
      await fulfillJson(route, { success: true, valid: true });
      return;
    }

    if (pathname.endsWith("/api/admin/auth/refresh")) {
      await fulfillJson(route, {
        success: true,
      });
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

test.describe("Admin detail page regressions", () => {
  test("analytics resets pagination when switching audience segments", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminBaseMocks(page);

    await page.route("**/api/admin/analytics/stats", async (route) => {
      await fulfillJson(route, {
        stats: {
          totalUsers: 21,
          activeUsers: 12,
          activeRate: 57.1,
          highValueUsers: 4,
          atRiskUsers: 2,
          totalRevenue: 912.45,
        },
      });
    });

    await page.route("**/api/admin/analytics/segments**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const segment = requestUrl.searchParams.get("segment") || "all";
      const offset = Number(requestUrl.searchParams.get("offset") || "0");
      const limit = Number(requestUrl.searchParams.get("limit") || "20");

      if (segment === "vip") {
        await fulfillJson(route, {
          segments: {
            users:
              offset === 0
                ? [
                    {
                      id: "vip-user-1",
                      email: "vip-reader@example.com",
                      createdAt: "2026-03-10T10:00:00.000Z",
                      wallet: { coins: 320 },
                      userMetrics: { ltv: 188.2, churnRisk: "low" },
                      userBehavior: { seriesViewed: 48 },
                    },
                  ]
                : [],
            total: 1,
            limit,
            offset,
          },
        });
        return;
      }

      const allUsers = Array.from({ length: 21 }, (_, index) => ({
        id: `all-user-${index + 1}`,
        email: `all-user-${index + 1}@example.com`,
        createdAt: "2026-03-01T10:00:00.000Z",
        wallet: { coins: index + 1 },
        userMetrics: { ltv: index + 10, churnRisk: index % 2 === 0 ? "low" : "medium" },
        userBehavior: { seriesViewed: index + 2 },
      }));
      const pagedUsers = allUsers.slice(offset, offset + limit);

      await fulfillJson(route, {
        segments: {
          users: pagedUsers,
          total: allUsers.length,
          limit,
          offset,
        },
      });
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/analytics", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await page.getByRole("button", { name: /用户分群|Audience segments/ }).click();
    await expect(page.getByText("all-user-1@example.com", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.getByRole("button", { name: /下一页|Next/ }).click();
    await expect(page.getByText("all-user-21@example.com", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText(/第 2 页，共 2 页|Page 2 of 2/, { exact: false })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.getByRole("button").filter({ hasText: /VIP/ }).click();
    await expect(page.getByText("vip-reader@example.com", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText(/第 1 页，共 1 页|Page 1 of 1/, { exact: false })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/analytics", runtimeIssues);
  });

  test("series detail blocks invalid pricing payloads before patching", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminBaseMocks(page);

    let patchCalls = 0;

    await page.route("**/api/admin/series/series-qa-001", async (route) => {
      if (route.request().method() === "PATCH") {
        patchCalls += 1;
        await fulfillJson(route, { success: true });
        return;
      }

      await fulfillJson(route, {
        series: {
          id: "series-qa-001",
          title: "Regression Test Series",
          type: "comic",
          status: "Ongoing",
          adult: false,
          isPublished: true,
          description: "A fixture series for admin detail validation.",
          genres: ["Action", "Drama"],
          coverUrl: "https://example.com/cover.jpg",
          coverTone: "moody",
          badge: "HOT",
          episodePrice: 3,
          ttfEnabled: true,
          ttfIntervalHours: 24,
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-10T10:00:00.000Z",
        },
      });
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/series/series-qa-001", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("button", { name: /编辑详情|Edit details/ })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.getByRole("button", { name: /编辑详情|Edit details/ }).click();

    await page.getByLabel("Default episode price").fill("3.5");
    await page.getByRole("button", { name: /保存更改|保存修改|Save changes/ }).click();

    await expect(page.getByText("Default episode price must be a whole-number point value.", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    expect(patchCalls).toBe(0);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/series/series-qa-001", runtimeIssues);
  });

  test("episodes workspace supports bulk edits and reorder actions", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminBaseMocks(page);

    let bulkCalls = 0;
    let reorderCalls = 0;

    await page.route("**/api/admin/series/series-qa-001", async (route) => {
      await fulfillJson(route, {
        series: {
          id: "series-qa-001",
          title: "Regression Test Series",
          type: "comic",
          status: "Ongoing",
          adult: false,
          isPublished: true,
          description: "A fixture series for episode workspace validation.",
          latestEpisodeId: "series-qa-001e2",
        },
      });
    });

    await page.route("**/api/admin/series/series-qa-001/episodes**", async (route) => {
      if (route.request().method() !== "GET") {
        await fulfillJson(route, { episode: { id: "series-qa-001e1" } });
        return;
      }

      await fulfillJson(route, {
        episodes: [
          {
            id: "series-qa-001e1",
            number: 1,
            title: "Episode One",
            pricePts: 3,
            previewFreePages: 1,
            ttfEligible: true,
            releasedAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-03-10T10:00:00.000Z",
          },
          {
            id: "series-qa-001e2",
            number: 2,
            title: "Episode Two",
            pricePts: 0,
            previewFreePages: 0,
            ttfEligible: false,
            releasedAt: "2026-03-02T10:00:00.000Z",
            updatedAt: "2026-03-11T10:00:00.000Z",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    });

    await page.route("**/api/admin/series/series-qa-001/episodes/reorder", async (route) => {
      reorderCalls += 1;
      await fulfillJson(route, { episodes: [] });
    });

    await page.route("**/api/admin/series/series-qa-001/episodes/bulk", async (route) => {
      bulkCalls += 1;
      await fulfillJson(route, { episodes: [] });
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/series/series-qa-001/episodes", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Regression Test Series" })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("Total episodes", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.getByLabel("Select episode 1").check();
    await expect(page.getByRole("button", { name: /批量编辑|Bulk edit/ })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.getByRole("button", { name: /批量编辑|Bulk edit/ }).click();

    await page.getByLabel("Bulk price").fill("9");
    await page.getByRole("button", { name: "Apply bulk update" }).click();
    await expect.poll(() => bulkCalls).toBe(1);

    await page.getByRole("button", { name: "Auto-renumber" }).click();
    await expect.poll(() => reorderCalls).toBe(1);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/series/series-qa-001/episodes", runtimeIssues);
  });
});
