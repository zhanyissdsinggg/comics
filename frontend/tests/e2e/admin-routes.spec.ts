import { expect, test, type Page, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const ADMIN_UI_TIMEOUT_MS = 15000;
const EMPTY_PAGINATION = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

const MOCK_ADMIN_SESSION = {
  adminId: "admin-e2e",
  adminRole: "super_admin",
  permissions: [],
  routePatterns: ["*"],
  homePath: "/admin",
  adminName: "E2E Admin",
  memberStatus: "active",
  authMode: "cookie",
  totpEnabled: false,
};

const ADMIN_ROUTE_CASES = [
  {
    route: "/admin/users",
    emptyStatePattern: /No users match this view yet\.|暂无用户|当前视图下还没有匹配的用户。|鏆傛棤鐢ㄦ埛/,
  },
  {
    route: "/admin/support",
    emptyStatePattern: /No support tickets yet\.|No tickets match the current filters\.|暂无工单|当前还没有客服工单。|当前筛选条件下没有匹配的工单。|当前视图下还没有匹配的客服工单。|鏆傛棤宸ュ崟/,
  },
  {
    route: "/admin/analytics",
    emptyStatePattern: /当前还没有可用的分析数据。|暂无分析数据|Analytics data is not available yet\./,
  },
  {
    route: "/admin/orders",
    emptyStatePattern: /No orders match this view yet\.|暂无订单|当前视图下还没有匹配的订单。/,
  },
  {
    route: "/admin/comments",
    emptyStatePattern: /No comments match this view yet\.|暂无评论|当前视图下还没有匹配的评论。/,
  },
  {
    route: "/admin/notifications",
    emptyStatePattern: /No notifications match this view yet\.|暂无通知|当前视图下还没有匹配的通知。/,
  },
  {
    route: "/admin/promotions",
    emptyStatePattern: /No promotions match this view yet\.|暂无活动|当前视图下还没有匹配的活动。/,
  },
  {
    route: "/admin/billing",
    emptyStatePattern: /No top-up packages match this view yet\.|暂无充值套餐|当前视图下还没有匹配的充值套餐。/,
  },
  {
    route: "/admin/marketing",
    emptyStatePattern: /No campaigns are available for this view\.|暂无活动|当前视图下还没有可用的活动。/,
  },
  {
    route: "/admin/recommendations",
    emptyStatePattern: /No recommendation slots exist yet\.|暂无推荐位|当前还没有推荐位。/,
  },
  {
    route: "/admin/logs",
    emptyStatePattern: /No audit logs were found for this view\.|未找到审计日志|当前视图下没有审计日志。/,
  },
  {
    route: "/admin/revenue",
    emptyStatePattern: /No revenue data is available for this range\.|暂无收入数据|当前时间范围内还没有收入数据。/,
  },
] as const;

const MERCH_SERIES_BODY = {
  series: [
    {
      id: "series-hero-001",
      title: "Midnight Signal",
      author: "Studio Orion",
      type: "comic",
      status: "Completed",
      adult: false,
      description: "A binge-ready romance thriller built for homepage rotation.",
      coverUrl: "https://cdn.example.com/series-hero-001-cover.jpg",
      bannerUrl: "https://cdn.example.com/series-hero-001-banner.jpg",
      genres: ["Romance", "Thriller"],
      episodeCount: 48,
      latestEpisodeId: "episode-48",
      freeEpisodeCount: 4,
      hasFreeEpisodes: true,
      isPublished: true,
      updatedAt: "2026-03-12T08:00:00.000Z",
    },
    {
      id: "series-hero-002",
      title: "Neon Contract",
      author: "Blue Harbor",
      type: "comic",
      status: "Ongoing",
      adult: false,
      description: "Fast-start fantasy with strong click appeal.",
      coverUrl: "https://cdn.example.com/series-hero-002-cover.jpg",
      genres: ["Fantasy", "Action"],
      episodeCount: 21,
      latestEpisodeId: "episode-21",
      freeEpisodeCount: 3,
      hasFreeEpisodes: true,
      isPublished: true,
      updatedAt: "2026-03-10T08:00:00.000Z",
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

async function primeAdminSession(page: Page): Promise<void> {
  await page.addInitScript(() => undefined);
}

function buildRecommendationSlotState(body: unknown): Array<Record<string, unknown>> {
  if (!body || typeof body !== "object" || !Array.isArray((body as { slots?: unknown[] }).slots)) {
    return [];
  }

  return (body as { slots?: unknown[] }).slots
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry, index) => {
      const slotName =
        typeof entry.slot === "string"
          ? entry.slot
          : typeof entry.name === "string"
            ? entry.name
            : `slot-${index + 1}`;

      return {
        id: typeof entry.id === "string" ? entry.id : `slot-${index + 1}`,
        slot: slotName,
        name: typeof entry.name === "string" ? entry.name : slotName,
        seriesIds: Array.isArray(entry.seriesIds) ? entry.seriesIds.map((item) => String(item || "")) : [],
        createdAt:
          typeof entry.createdAt === "string" ? entry.createdAt : "2026-03-12T00:00:00.000Z",
        updatedAt:
          typeof entry.updatedAt === "string" ? entry.updatedAt : "2026-03-12T00:00:00.000Z",
      };
    });
}

async function installAdminApiMocks(
  page: Page,
  options: {
    dashboardStatsBody?: unknown;
    creatorsAuditBody?: unknown;
    supportBody?: unknown;
    usersBody?: unknown;
    seriesBody?: unknown;
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
    recommendationSlotPerformanceById?: Record<string, unknown>;
    recommendationRankingsBody?: unknown;
    recommendationAnalyticsBody?: unknown;
    hotKeywordsBody?: unknown;
    logsBody?: unknown;
    revenueStatsBody?: unknown;
    revenueTrendBody?: unknown;
    revenueChannelsBody?: unknown;
    revenuePromotionsBody?: unknown;
    revenueUserValueBody?: unknown;
    revenueOrderStatusBody?: unknown;
  } = {},
): Promise<void> {
  let recommendationSlotsState = buildRecommendationSlotState(options.recommendationSlotsBody);

  await page.route("**/api/health", async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route("**/api/search/hot**", async (route) => {
    await fulfillJson(route, options.hotKeywordsBody ?? { keywords: [] });
  });

  await page.route("**/api/admin/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const method = route.request().method();

    if (pathname.endsWith("/api/admin/auth/verify")) {
      await fulfillJson(route, { success: true, valid: true, session: MOCK_ADMIN_SESSION });
      return;
    }

    if (pathname.endsWith("/api/admin/auth/refresh")) {
      await fulfillJson(route, {
        success: true,
        session: MOCK_ADMIN_SESSION,
      });
      return;
    }

    if (pathname.endsWith("/api/admin/stats/dashboard")) {
      await fulfillJson(route, options.dashboardStatsBody ?? {
        users: { total: 0, change: 0, trend: "up" },
        series: { total: 0, change: 0, trend: "up" },
        orders: { total: 0, change: 0, trend: "up" },
        revenue: { total: 0, change: 0, trend: "up" },
        views: { total: 0, change: 0, trend: "up" },
        comments: { total: 0, change: 0, trend: "up" },
      });
      return;
    }

    if (pathname.endsWith("/api/admin/creators/audit")) {
      await fulfillJson(route, options.creatorsAuditBody ?? {
        audit: {
          creators: [],
          missingAuthorSeries: [],
          legacyAuthorOnlySeries: [],
          namingRiskCreators: [],
          stats: {
            totalSeries: 0,
            creatorCount: 0,
            attributedSeriesCount: 0,
            structuredCreatorSeriesCount: 0,
            legacyAuthorOnlySeriesCount: 0,
            missingAuthorSeriesCount: 0,
            namingRiskCreatorCount: 0,
            unpublishedSeriesCount: 0,
          },
        },
      });
      return;
    }

    if (pathname.endsWith("/api/admin/users")) {
      await fulfillJson(route, options.usersBody ?? { data: [], pagination: EMPTY_PAGINATION });
      return;
    }

    if (pathname.endsWith("/api/admin/series")) {
      await fulfillJson(route, options.seriesBody ?? { series: [] });
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
      if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}") as Record<string, unknown>;
        const slotName =
          typeof body.slot === "string"
            ? body.slot
            : typeof body.name === "string"
              ? body.name
              : `slot-${recommendationSlotsState.length + 1}`;
        const nextSlot = {
          id: `slot-${recommendationSlotsState.length + 1}`,
          slot: slotName,
          name: slotName,
          seriesIds: Array.isArray(body.seriesIds) ? body.seriesIds.map((item) => String(item || "")) : [],
          createdAt: "2026-03-12T00:00:00.000Z",
          updatedAt: "2026-03-12T00:00:00.000Z",
        };
        recommendationSlotsState = [...recommendationSlotsState, nextSlot];
        await fulfillJson(route, { slot: nextSlot });
        return;
      }

      await fulfillJson(route, { slots: recommendationSlotsState, total: recommendationSlotsState.length });
      return;
    }

    if (/\/api\/admin\/recommendations\/slots\/[^/]+\/performance$/.test(pathname)) {
      const pathnameParts = pathname.split("/");
      const slotId = pathnameParts[pathnameParts.length - 2] || "";
      await fulfillJson(route, {
        performance: options.recommendationSlotPerformanceById?.[slotId] ?? {
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          avgCtr: "0.00",
          avgConversionRate: "0.00",
        },
      });
      return;
    }

    if (/\/api\/admin\/recommendations\/slots\/[^/]+$/.test(pathname)) {
      const slotId = pathname.split("/").pop() || "";

      if (method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}") as Record<string, unknown>;
        recommendationSlotsState = recommendationSlotsState.map((slot) => {
          if (slot.id !== slotId) {
            return slot;
          }

          const nextName =
            typeof body.slot === "string"
              ? body.slot
              : typeof body.name === "string"
                ? body.name
                : String(slot.slot || slot.name || slotId);

          return {
            ...slot,
            slot: nextName,
            name: nextName,
            seriesIds: Array.isArray(body.seriesIds)
              ? body.seriesIds.map((item) => String(item || ""))
              : slot.seriesIds,
            updatedAt: "2026-03-13T00:00:00.000Z",
          };
        });

        const updatedSlot = recommendationSlotsState.find((slot) => slot.id === slotId) || null;
        await fulfillJson(route, { slot: updatedSlot });
        return;
      }

      if (method === "DELETE") {
        recommendationSlotsState = recommendationSlotsState.filter((slot) => slot.id !== slotId);
        await fulfillJson(route, { success: true });
        return;
      }
    }

    if (pathname.endsWith("/api/admin/recommendations/rankings")) {
      await fulfillJson(route, options.recommendationRankingsBody ?? { configs: [], total: 0 });
      return;
    }

    if (pathname.endsWith("/api/admin/recommendations/analytics")) {
      await fulfillJson(route, options.recommendationAnalyticsBody ?? { analytics: [], total: 0 });
      return;
    }

    if (pathname.endsWith("/api/admin/logs")) {
      await fulfillJson(route, options.logsBody ?? { logs: [] });
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
  test("should render admin dashboard with actionable content data", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, {
      dashboardStatsBody: {
        users: { total: 340, change: 4.2, trend: "up" },
        series: { total: 12, change: 0, trend: "up" },
        orders: { total: 18, change: 6.5, trend: "up" },
        revenue: { total: 2400, change: 6.5, trend: "up" },
        views: { total: 5600, change: 8.1, trend: "up" },
        comments: { total: 38, change: 3.4, trend: "up" },
      },
      seriesBody: {
        series: [
          {
            id: "series-alpha",
            title: "Alpha Signal",
            author: "Studio North",
            type: "comic",
            status: "Ongoing",
            description: "A polished fantasy series with enough details to ship confidently to storefront readers.",
            coverUrl: "https://cdn.example.com/alpha.jpg",
            genres: ["Fantasy"],
            episodeCount: 24,
            isPublished: true,
            updatedAt: "2026-03-28T10:00:00.000Z",
          },
          {
            id: "series-beta",
            title: "Beta Draft",
            author: "",
            type: "novel",
            status: "Ongoing",
            description: "Short draft.",
            coverUrl: "",
            genres: [],
            episodeCount: 0,
            isPublished: false,
            updatedAt: "2026-03-29T08:00:00.000Z",
          },
        ],
      },
      supportBody: {
        data: [
          {
            id: "ticket-1",
            subject: "支付失败",
            status: "open",
            userEmail: "reader@example.com",
            updatedAt: "2026-03-29T09:00:00.000Z",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 5,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
      ordersBody: {
        data: [
          {
            id: "order-1",
            orderId: "order-1",
            userId: "user-1",
            amount: 9.99,
            currency: "USD",
            status: "paid",
            createdAt: "2026-03-29T07:30:00.000Z",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 5,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
      commentsBody: {
        comments: [
          {
            id: "comment-1",
            author: "reader@example.com",
            text: "这一话节奏很好，继续保持。",
            hidden: false,
            createdAt: "2026-03-29T06:00:00.000Z",
          },
        ],
      },
    });
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "上来先看待处理，再看趋势。" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByRole("heading", { name: "待处理事项" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("待补公开署名").first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByRole("heading", { name: "最近更新的作品" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByRole("heading", { name: "客服队列" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByRole("heading", { name: "最近订单" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByRole("heading", { name: "最新评论" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("Beta Draft").first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("支付失败").first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("reader@example.com").first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin", runtimeIssues);
  });

  for (const scenario of ADMIN_ROUTE_CASES) {
    test(`should render ${scenario.route} empty state without runtime crash`, async ({ page }) => {
      await primeAdminSession(page);
      await installAdminApiMocks(page);
      const runtimeIssues = collectRuntimeIssues(page);

      const response = await page.goto(scenario.route, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBeTruthy();

      await expect(page).toHaveURL(new RegExp(`${scenario.route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
      await expect(page.getByText(scenario.emptyStatePattern).first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

      await page.waitForTimeout(300);
      await expectNoRuntimeIssues(scenario.route, runtimeIssues);
    });
  }

  test("should render merchandising workspace with homepage recommendations", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, {
      seriesBody: MERCH_SERIES_BODY,
      recommendationSlotsBody: { slots: [], total: 0 },
      hotKeywordsBody: {
        keywords: [
          { keyword: "romance", count: 1820, growthLabel: "今日关注" },
          { keyword: "fantasy", count: 1210, growthLabel: "热度上升" },
        ],
      },
    });
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin/merchandising", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "首页编排" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByRole("heading", { name: "推荐位状态" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByRole("heading", { name: "主视觉候选作品" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("继续读这部", { exact: true }).first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("适合连看", { exact: true }).first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByRole("heading", { name: "Midnight Signal" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("今日关注", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByRole("button", { name: "应用当前建议" }).first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/merchandising", runtimeIssues);
  });

  test("should render storefront audit workspace with editorial admin copy", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, {
      seriesBody: MERCH_SERIES_BODY,
    });
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin/storefront", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "前台巡检" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("先补读者真的会感觉到的缺口。", { exact: false })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByRole("heading", { name: "建议处理顺序" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/storefront", runtimeIssues);
  });

  test("should render creators workspace with editorial admin copy", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, {
      creatorsAuditBody: {
        audit: {
          creators: [
            {
              slug: "studio-orion",
              name: "Studio Orion",
              path: "/creators/studio-orion",
              type: "studio",
              titleCount: 1,
              publishedCount: 1,
              unpublishedCount: 0,
              completedCount: 1,
              adultCount: 0,
              coverReadyCount: 1,
              descriptionReadyCount: 1,
              genreReadyCount: 1,
              episodicCount: 1,
              latestUpdatedAt: "2026-03-12T08:00:00.000Z",
              spotlightSeries: {
                id: "series-hero-001",
                title: "Midnight Signal",
                type: "comic",
                status: "Completed",
                adult: false,
                isPublished: true,
                coverUrl: "https://cdn.example.com/series-hero-001-cover.jpg",
                description: "A binge-ready romance thriller built for homepage rotation.",
                genres: ["Romance", "Thriller"],
                updatedAt: "2026-03-12T08:00:00.000Z",
                episodeCount: 48,
                author: "",
                creatorCredits: [],
                creatorSource: "normalized",
              },
              topGenres: ["Romance", "Thriller"],
              variants: [],
              series: [],
              structuredSeriesCount: 1,
              legacyAuthorOnlyCount: 0,
              hasNamingRisk: false,
              metadataCoverageRate: 100,
            },
          ],
          missingAuthorSeries: [],
          legacyAuthorOnlySeries: [
            {
              id: "series-hero-002",
              title: "Neon Contract",
              type: "comic",
              status: "Ongoing",
              adult: false,
              isPublished: true,
              coverUrl: "https://cdn.example.com/series-hero-002-cover.jpg",
              description: "Fast-start fantasy with strong click appeal.",
              genres: ["Fantasy", "Action"],
              updatedAt: "2026-03-10T08:00:00.000Z",
              episodeCount: 21,
              author: "Blue Harbor",
              creatorCredits: [],
              creatorSource: "legacy_author",
            },
          ],
          namingRiskCreators: [],
          stats: {
            totalSeries: 2,
            creatorCount: 1,
            attributedSeriesCount: 2,
            structuredCreatorSeriesCount: 1,
            legacyAuthorOnlySeriesCount: 1,
            missingAuthorSeriesCount: 0,
            namingRiskCreatorCount: 0,
            unpublishedSeriesCount: 0,
          },
        },
      },
    });
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin/creators", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { level: 1, name: "创作者" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("先补齐署名，再收命名。", { exact: false })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByRole("heading", { name: "筛选创作者目录" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/creators", runtimeIssues);
  });

  test("should sync merchandising recommendations into an existing slot", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, {
      seriesBody: MERCH_SERIES_BODY,
      recommendationSlotsBody: {
        slots: [
          {
            id: "slot-home-hero",
            slot: "home-hero",
            name: "home-hero",
            seriesIds: ["series-hero-002"],
            createdAt: "2026-03-12T08:00:00.000Z",
            updatedAt: "2026-03-12T08:00:00.000Z",
          },
        ],
        total: 1,
      },
      hotKeywordsBody: {
        keywords: [{ keyword: "romance", count: 1820, growthLabel: "今日关注" }],
      },
    });
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin/merchandising", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const slotHealthSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "推荐位状态" }),
    });
    const heroSlotCard = slotHealthSection.locator("article").filter({
      has: page.getByRole("heading", { name: "首页主视觉" }),
    });

    await expect(heroSlotCard.getByText("待同步", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await heroSlotCard.getByRole("button", { name: "同步当前建议" }).click();

    await expect(page.getByText("首页主视觉 已同步到当前编排建议。", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(heroSlotCard.getByText("已对齐", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(heroSlotCard.getByText("Midnight Signal", { exact: true }).first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/merchandising", runtimeIssues);
  });

  test("should show merchandising performance for active homepage slots", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, {
      seriesBody: MERCH_SERIES_BODY,
      recommendationSlotsBody: {
        slots: [
          {
            id: "slot-home-hero",
            slot: "home-hero",
            name: "home-hero",
            seriesIds: ["series-hero-001", "series-hero-002"],
            createdAt: "2026-03-12T08:00:00.000Z",
            updatedAt: "2026-03-12T08:00:00.000Z",
          },
          {
            id: "slot-home-free-start",
            slot: "home-free-start",
            name: "home-free-start",
            seriesIds: ["series-hero-001"],
            createdAt: "2026-03-12T08:00:00.000Z",
            updatedAt: "2026-03-12T08:00:00.000Z",
          },
        ],
        total: 2,
      },
      recommendationSlotPerformanceById: {
        "slot-home-hero": {
          totalImpressions: 4200,
          totalClicks: 105,
          totalConversions: 15,
          avgCtr: "2.50",
          avgConversionRate: "14.29",
        },
        "slot-home-free-start": {
          totalImpressions: 2800,
          totalClicks: 84,
          totalConversions: 13,
          avgCtr: "3.00",
          avgConversionRate: "15.48",
        },
      },
      hotKeywordsBody: {
        keywords: [{ keyword: "romance", count: 1820, growthLabel: "今日关注" }],
      },
    });
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin/merchandising", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const performanceSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "推荐位表现" }),
    });

    await expect(performanceSection.getByText("曝光", { exact: true }).first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(performanceSection.getByText(/7K|7,000|7000/)).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(performanceSection.getByText("2.70%", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(performanceSection.getByText("当前作品：Midnight Signal / Neon Contract", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(performanceSection.getByText("状态稳定", { exact: true }).first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/merchandising", runtimeIssues);
  });

  test("should show merchandising optimization guidance for low-performing slots", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, {
      seriesBody: MERCH_SERIES_BODY,
      recommendationSlotsBody: {
        slots: [
          {
            id: "slot-home-free-start",
            slot: "home-free-start",
            name: "home-free-start",
            seriesIds: ["series-hero-001"],
            createdAt: "2026-03-12T08:00:00.000Z",
            updatedAt: "2026-03-12T08:00:00.000Z",
          },
        ],
        total: 1,
      },
      recommendationSlotPerformanceById: {
        "slot-home-free-start": {
          totalImpressions: 3200,
          totalClicks: 35,
          totalConversions: 4,
          avgCtr: "1.09",
          avgConversionRate: "11.43",
        },
      },
      hotKeywordsBody: {
        keywords: [{ keyword: "romance", count: 1820, growthLabel: "今日关注" }],
      },
    });
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin/merchandising", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const optimizationSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "待优化队列" }),
    });
    const lowCtrCard = optimizationSection.locator("article").filter({
      hasText: "点击承接偏弱",
    });

    await expect(lowCtrCard).toContainText("复制备选作品 ID", { timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(lowCtrCard).toContainText("Neon Contract", { timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(lowCtrCard).toContainText("1.09%", { timeout: ADMIN_UI_TIMEOUT_MS });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/merchandising", runtimeIssues);
  });

  test("should defer recommendation requests until each tab is opened", async ({ page }) => {
    let slotsRequests = 0;
    let rankingsRequests = 0;
    let analyticsRequests = 0;

    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;

      if (pathname.endsWith("/api/admin/recommendations/slots")) {
        slotsRequests += 1;
      }

      if (pathname.endsWith("/api/admin/recommendations/rankings")) {
        rankingsRequests += 1;
      }

      if (pathname.endsWith("/api/admin/recommendations/analytics")) {
        analyticsRequests += 1;
      }
    });

    await primeAdminSession(page);
    await installAdminApiMocks(page);
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin/recommendations", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "搜索与发现" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("只有打开“榜单规则”标签后才会加载。", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect.poll(() => slotsRequests).toBe(1);
    await expect.poll(() => rankingsRequests).toBe(0);
    await expect.poll(() => analyticsRequests).toBe(0);

    await page.getByRole("button", { name: /榜单|Rankings/ }).click();
    await expect.poll(() => rankingsRequests).toBe(1);

    await page.getByRole("button", { name: /分析|Analytics/ }).click();
    await expect.poll(() => analyticsRequests).toBe(1);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/recommendations", runtimeIssues);
  });

  test("should only offer current ranking strategies when creating a new ranking rule", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page);
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin/recommendations", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await page.getByRole("button", { name: /榜单|Rankings/ }).click();
    await page.getByRole("button", { name: "新建榜单规则" }).click();

    const rankingOptions = page.locator("#ranking-type option");
    await expect(rankingOptions).toHaveText(["趋势排序", "新作优先"]);
    await expect(page.getByText("旧评分（兼容）", { exact: true })).toHaveCount(0);
    await expect(page.getByText("旧评分人数（兼容）", { exact: true })).toHaveCount(0);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/recommendations", runtimeIssues);
  });

  test("should filter recommendation analytics by slot token", async ({ page }) => {
    const analyticsRequests: string[] = [];

    page.on("request", (request) => {
      const requestUrl = new URL(request.url());
      if (requestUrl.pathname.endsWith("/api/admin/recommendations/analytics")) {
        analyticsRequests.push(request.url());
      }
    });

    await primeAdminSession(page);
    await installAdminApiMocks(page);
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin/recommendations", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await page.getByRole("button", { name: /分析|Analytics/ }).click();
    await expect(page.locator("#analytics-slot-filter")).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.locator("#analytics-slot-filter").selectOption("library-return");

    await expect.poll(() =>
      analyticsRequests.some((requestUrl) => new URL(requestUrl).searchParams.get("slot") === "library-return"),
    ).toBe(true);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/recommendations", runtimeIssues);
  });

  test("should create a library return slot from the preset form", async ({ page }) => {
    let createdSlotPayload: Record<string, unknown> | null = null;

    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.endsWith("/api/admin/recommendations/slots") && request.method() === "POST") {
        createdSlotPayload = JSON.parse(request.postData() || "{}") as Record<string, unknown>;
      }
    });

    await primeAdminSession(page);
    await installAdminApiMocks(page);
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin/recommendations", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.getByRole("button", { name: "新建推荐位" }).click();

    await expect(page.locator("#slot-preset")).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.locator("#slot-token")).toHaveValue("library-return");
    await page.locator("#slot-series-ids").fill("series-hero-001\nseries-hero-002");
    await page.locator('[role="dialog"] button[type="submit"]').click();

    await expect.poll(() => createdSlotPayload?.slot).toBe("library-return");
    await expect.poll(() => createdSlotPayload?.seriesIds).toEqual(["series-hero-001", "series-hero-002"]);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/recommendations", runtimeIssues);
  });

  test("should filter logs by fallback user identity", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, {
      logsBody: {
        logs: [
          {
            id: "log-1",
            action: "EXPORT",
            resource: "orders",
            resourceId: "order-1",
            userId: "operator-fallback",
            details: { scope: "orders" },
            createdAt: "2026-03-12T10:00:00.000Z",
          },
          {
            id: "log-2",
            action: "DELETE",
            resource: "series",
            resourceId: "series-9",
            adminId: "admin-primary",
            details: { scope: "series" },
            createdAt: "2026-03-12T09:30:00.000Z",
          },
        ],
      },
    });
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/admin/logs", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "审计日志" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.locator("select").nth(1).selectOption("operator-fallback");

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("operator-fallback");
    await expect(rows.first()).not.toContainText("admin-primary");

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/logs", runtimeIssues);
  });

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

    await expect(page.getByRole("heading", { level: 1, name: "客服" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("reader@example.com", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("I was charged twice and need a refund update.", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.locator("tbody span").filter({ hasText: /^(Open|待处理)$/ }).first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/support", runtimeIssues);
    expect(docsJsonRequests).toBe(0);
  });

  test("should not send bearer headers for admin api requests", async ({ page }) => {
    const authorizationHeaders: string[] = [];

    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.startsWith("/api/admin")) {
        const authorization = request.headers().authorization;
        if (authorization) {
          authorizationHeaders.push(authorization);
        }
      }
    });

    await primeAdminSession(page);
    await installAdminApiMocks(page);

    const response = await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: /系统设置|System Settings/ })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    expect(authorizationHeaders).toEqual([]);
  });
});
