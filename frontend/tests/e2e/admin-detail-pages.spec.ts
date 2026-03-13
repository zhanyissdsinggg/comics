import { expect, test, type Page, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const ADMIN_ACCESS_TOKEN = "e2e-admin-access-token";
const ADMIN_REFRESH_TOKEN = "e2e-admin-refresh-token";
const ADMIN_UI_TIMEOUT_MS = 15000;

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function primeAdminSession(page: Page): Promise<void> {
  await page.addInitScript(
    ([accessToken, refreshToken]) => {
      window.localStorage.setItem("admin_token", accessToken);
      window.localStorage.setItem("admin_refresh_token", refreshToken);
    },
    [ADMIN_ACCESS_TOKEN, ADMIN_REFRESH_TOKEN],
  );
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
        accessToken: ADMIN_ACCESS_TOKEN,
        refreshToken: ADMIN_REFRESH_TOKEN,
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

    await page.getByRole("button", { name: "用户分群" }).click();
    await expect(page.getByRole("heading", { name: "用户分群" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("all-user-1@example.com", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.getByRole("button", { name: "下一页" }).click();
    await expect(page.getByText("all-user-21@example.com", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("第 2 / 2 页，共 21 条", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.getByRole("button", { name: "VIP 用户" }).click();
    await expect(page.getByText("vip-reader@example.com", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("第 1 / 1 页，共 1 条", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

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

    await expect(page.getByRole("button", { name: "编辑作品" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.getByRole("button", { name: "编辑作品" }).click();

    await page.getByLabel("章节价格").fill("3.5");
    await page.getByRole("button", { name: "保存更改" }).click();

    await expect(page.getByText("章节价格必须是整数金币。", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    expect(patchCalls).toBe(0);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/series/series-qa-001", runtimeIssues);
  });
});
