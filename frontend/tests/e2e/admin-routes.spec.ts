import { expect, test, type Page, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const ADMIN_ACCESS_TOKEN = "e2e-admin-access-token";
const ADMIN_REFRESH_TOKEN = "e2e-admin-refresh-token";
const ADMIN_UI_TIMEOUT_MS = 15000;
const EMPTY_PAGINATION = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

const ADMIN_ROUTE_CASES = [
  {
    route: "/admin/users",
    emptyStateMessage: "No users yet.",
  },
  {
    route: "/admin/support",
    emptyStateMessage: "No tickets yet.",
  },
  {
    route: "/admin/analytics",
    emptyStateMessage: "No analytics data is available yet.",
  },
  {
    route: "/admin/orders",
    emptyStateMessage: "No orders yet.",
  },
  {
    route: "/admin/comments",
    emptyStateMessage: "No comments yet.",
  },
  {
    route: "/admin/notifications",
    emptyStateMessage: "No notifications yet.",
  },
  {
    route: "/admin/promotions",
    emptyStateMessage: "No promotions yet.",
  },
  {
    route: "/admin/billing",
    emptyStateMessage: "No billing packages yet.",
  },
  {
    route: "/admin/marketing",
    emptyStateMessage: "No campaigns yet.",
  },
  {
    route: "/admin/recommendations",
    emptyStateMessage: "No recommendation slots have been created yet.",
  },
  {
    route: "/admin/revenue",
    emptyStateMessage: "No revenue data available yet.",
  },
] as const;

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

async function installAdminApiMocks(
  page: Page,
  options: {
    supportBody?: unknown;
    usersBody?: unknown;
    ordersBody?: unknown;
    commentsBody?: unknown;
    notificationsBody?: unknown;
    promotionsBody?: unknown;
    billingBody?: unknown;
    analyticsStatsBody?: unknown;
    analyticsSegmentsBody?: unknown;
    analyticsUserBody?: unknown;
    marketingCampaignsBody?: unknown;
    marketingStatsBody?: unknown;
    marketingSegmentsBody?: unknown;
    marketingTypesBody?: unknown;
    recommendationSlotsBody?: unknown;
    recommendationRankingsBody?: unknown;
    recommendationAnalyticsBody?: unknown;
    revenueStatsBody?: unknown;
    revenueTrendBody?: unknown;
    revenueChannelsBody?: unknown;
    revenuePromotionsBody?: unknown;
    revenueUserValueBody?: unknown;
    revenueOrderStatusBody?: unknown;
  } = {},
): Promise<void> {
  await page.route("**/api/health", async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route("**/api/admin/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;

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

    if (pathname.endsWith("/api/admin/users")) {
      await fulfillJson(route, options.usersBody ?? { data: [], pagination: EMPTY_PAGINATION });
      return;
    }

    if (pathname.endsWith("/api/admin/support")) {
      await fulfillJson(route, options.supportBody ?? { data: [], pagination: EMPTY_PAGINATION });
      return;
    }

    if (pathname.endsWith("/api/admin/orders")) {
      await fulfillJson(route, options.ordersBody ?? { data: [], pagination: EMPTY_PAGINATION });
      return;
    }

    if (pathname.endsWith("/api/admin/comments")) {
      await fulfillJson(route, options.commentsBody ?? { data: [], pagination: EMPTY_PAGINATION });
      return;
    }

    if (pathname.endsWith("/api/admin/notifications")) {
      await fulfillJson(route, options.notificationsBody ?? { data: [], pagination: EMPTY_PAGINATION });
      return;
    }

    if (pathname.endsWith("/api/admin/promotions")) {
      await fulfillJson(route, options.promotionsBody ?? { promotions: [], pagination: EMPTY_PAGINATION });
      return;
    }

    if (pathname.endsWith("/api/admin/billing")) {
      await fulfillJson(route, options.billingBody ?? { data: [], pagination: EMPTY_PAGINATION });
      return;
    }

    if (pathname.endsWith("/api/admin/analytics/stats")) {
      await fulfillJson(route, options.analyticsStatsBody ?? { stats: null });
      return;
    }

    if (pathname.endsWith("/api/admin/analytics/segments")) {
      await fulfillJson(route, options.analyticsSegmentsBody ?? {
        segments: {
          users: [],
          total: 0,
          limit: 20,
          offset: 0,
        },
      });
      return;
    }

    if (/\/api\/admin\/analytics\/users\/[^/]+$/.test(pathname)) {
      await fulfillJson(route, options.analyticsUserBody ?? { analytics: null });
      return;
    }

    if (pathname.endsWith("/api/admin/marketing/campaigns")) {
      await fulfillJson(route, options.marketingCampaignsBody ?? { campaigns: [], total: 0 });
      return;
    }

    if (pathname.includes("/api/admin/marketing/stats/by-segment")) {
      await fulfillJson(route, options.marketingSegmentsBody ?? { segments: [] });
      return;
    }

    if (pathname.includes("/api/admin/marketing/stats/by-type")) {
      await fulfillJson(route, options.marketingTypesBody ?? { types: [] });
      return;
    }

    if (pathname.includes("/api/admin/marketing/stats")) {
      await fulfillJson(route, options.marketingStatsBody ?? { stats: null });
      return;
    }

    if (pathname.endsWith("/api/admin/recommendations/slots")) {
      await fulfillJson(route, options.recommendationSlotsBody ?? { slots: [], total: 0 });
      return;
    }

    if (pathname.endsWith("/api/admin/recommendations/rankings")) {
      await fulfillJson(route, options.recommendationRankingsBody ?? { configs: [], total: 0 });
      return;
    }

    if (pathname.endsWith("/api/admin/recommendations/analytics")) {
      await fulfillJson(route, options.recommendationAnalyticsBody ?? { analytics: [], total: 0 });
      return;
    }

    if (pathname.includes("/api/admin/revenue/stats")) {
      await fulfillJson(route, options.revenueStatsBody ?? { stats: null });
      return;
    }

    if (pathname.includes("/api/admin/revenue/trend")) {
      await fulfillJson(route, options.revenueTrendBody ?? { trend: [] });
      return;
    }

    if (pathname.includes("/api/admin/revenue/channels")) {
      await fulfillJson(route, options.revenueChannelsBody ?? { channels: [] });
      return;
    }

    if (pathname.includes("/api/admin/revenue/promotions")) {
      await fulfillJson(route, options.revenuePromotionsBody ?? { promotions: [], attributionModel: null, roiAvailable: true });
      return;
    }

    if (pathname.endsWith("/api/admin/revenue/user-value-distribution")) {
      await fulfillJson(route, options.revenueUserValueBody ?? { distribution: null });
      return;
    }

    if (pathname.includes("/api/admin/revenue/order-status-distribution")) {
      await fulfillJson(route, options.revenueOrderStatusBody ?? { distribution: null });
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

test.describe("Admin route regression", () => {
  for (const scenario of ADMIN_ROUTE_CASES) {
    test(`should render ${scenario.route} empty state without runtime crash`, async ({ page }) => {
      await primeAdminSession(page);
      await installAdminApiMocks(page);
      const runtimeIssues = collectRuntimeIssues(page);

      const response = await page.goto(scenario.route, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBeTruthy();

      await expect(page).toHaveURL(new RegExp(`${scenario.route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
      await expect(page.getByText(scenario.emptyStateMessage, { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

      await page.waitForTimeout(300);
      await expectNoRuntimeIssues(scenario.route, runtimeIssues);
    });
  }

  test("should render admin support data without requesting docs-json", async ({ page }) => {
    let docsJsonRequests = 0;

    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith("/api/docs-json")) {
        docsJsonRequests += 1;
      }
    });

    await primeAdminSession(page);
    await installAdminApiMocks(page, {
      supportBody: {
        data: [
          {
            id: "ticket-1",
            userId: "user-42",
            userEmail: "reader@example.com",
            subject: "Need help with checkout",
            message: "I was charged twice and need a refund update.",
            status: "open",
            createdAt: "2026-03-11T08:00:00.000Z",
            updatedAt: "2026-03-11T09:15:00.000Z",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/support", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Support Tickets" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("reader@example.com", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("I was charged twice and need a refund update.", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.locator("tbody span", { hasText: "Open" }).first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/support", runtimeIssues);
    expect(docsJsonRequests).toBe(0);
  });
});


