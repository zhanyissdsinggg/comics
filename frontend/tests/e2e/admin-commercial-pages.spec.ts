import { expect, test, type Page, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const ADMIN_UI_TIMEOUT_MS = 15000;

type AdminRouteHandler = (route: Route, url: URL) => Promise<boolean>;

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function primeAdminSession(page: Page): Promise<void> {
  await page.addInitScript(() => undefined);
}

async function installAdminApiMocks(page: Page, handler: AdminRouteHandler): Promise<void> {
  await page.route("**/api/health", async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route("**/api/admin/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname.endsWith("/api/admin/auth/verify")) {
      await fulfillJson(route, { success: true, valid: true });
      return;
    }

    if (pathname.endsWith("/api/admin/auth/refresh")) {
      await fulfillJson(route, { success: true });
      return;
    }

    if (await handler(route, url)) {
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

test.describe("Admin commercial page regressions", () => {
  test("marketing renders the calm campaign workspace with live data views", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/marketing/campaigns")) {
        await fulfillJson(route, {
          campaigns: [
            {
              id: "campaign-1",
              name: "Spring comeback",
              description: "Reconnect dormant readers with a simpler homepage message.",
              type: "email",
              status: "active",
              targetSegment: "at-risk",
              budget: 1200,
              spent: 840,
              startDate: "2026-03-01",
              endDate: "2026-03-20",
              createdAt: "2026-02-28T08:00:00.000Z",
              analytics: [{ revenue: 4200, converted: 96, roi: 3.5 }],
            },
          ],
          total: 1,
        });
        return true;
      }

      if (url.pathname.includes("/api/admin/marketing/stats/by-segment")) {
        await fulfillJson(route, {
          segments: [
            {
              segment: "at-risk",
              count: 1,
              budget: 1200,
              spent: 840,
              revenue: 4200,
              converted: 96,
            },
          ],
        });
        return true;
      }

      if (url.pathname.includes("/api/admin/marketing/stats/by-type")) {
        await fulfillJson(route, {
          types: [
            {
              type: "email",
              count: 1,
              budget: 1200,
              spent: 840,
              revenue: 4200,
              converted: 96,
            },
          ],
        });
        return true;
      }

      if (url.pathname.includes("/api/admin/marketing/stats")) {
        await fulfillJson(route, {
          stats: {
            totalCampaigns: 1,
            activeCampaigns: 1,
            totalBudget: 1200,
            totalSpent: 840,
            totalRevenue: 4200,
            avgRoi: 3.5,
            totalConverted: 96,
          },
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/marketing", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "营销活动" })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("button", { name: "新建活动" })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("Spring comeback", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: /总览|Overview/ }).click();
    await expect(page.getByText("归因收入", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: /分人群|By segment/ }).click();
    await expect(page.getByText("流失风险读者", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/marketing", runtimeIssues);
  });

  test("revenue renders overview, channel, and promotion views in the new admin language", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.includes("/api/admin/revenue/stats")) {
        await fulfillJson(route, {
          stats: {
            totalRevenue: 12800,
            totalOrders: 420,
            avgOrderValue: 30.48,
            totalRefunded: 640,
            netRevenue: 12160,
          },
        });
        return true;
      }

      if (url.pathname.includes("/api/admin/revenue/trend")) {
        await fulfillJson(route, {
          trend: [
            { date: "2026-03-10", revenue: 4300, orders: 142 },
            { date: "2026-03-11", revenue: 4200, orders: 138 },
          ],
        });
        return true;
      }

      if (url.pathname.includes("/api/admin/revenue/channels")) {
        await fulfillJson(route, {
          channels: [
            { channel: "apple_store", orders: 200, revenue: 7000, avgOrderValue: 35 },
          ],
        });
        return true;
      }

      if (url.pathname.includes("/api/admin/revenue/promotions")) {
        await fulfillJson(route, {
          promotions: [
            { promotionId: "promo-1", title: "Spring relaunch", orders: 122, revenue: 3800, roi: null, active: true },
          ],
          attributionModel: "order_audit",
          roiAvailable: false,
        });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/revenue/user-value-distribution")) {
        await fulfillJson(route, {
          distribution: { highValue: 24, mediumValue: 80, lowValue: 160, noValue: 300 },
        });
        return true;
      }

      if (url.pathname.includes("/api/admin/revenue/order-status-distribution")) {
        await fulfillJson(route, {
          distribution: { pending: 18, paid: 420, failed: 9, refunded: 12 },
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/revenue", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { level: 1, name: "Revenue", exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("heading", { name: "Revenue overview" })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("Reader value mix", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: /渠道|Channels/ }).click();
    await expect(page.getByText("Apple Store", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: "Promotions" }).click();
    await expect(page.getByText("Spring relaunch", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText(/ROI will remain unavailable until spend attribution is wired in\./)).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/revenue", runtimeIssues);
  });
});
