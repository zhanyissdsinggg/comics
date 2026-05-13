import { expect, test, type Page, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const ADMIN_UI_TIMEOUT_MS = 15000;

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
      await fulfillJson(route, {
        success: true,
        valid: true,
        session: MOCK_ADMIN_SESSION,
      });
      return;
    }

    if (pathname.endsWith("/api/admin/auth/refresh")) {
      await fulfillJson(route, {
        success: true,
        session: MOCK_ADMIN_SESSION,
      });
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

test.describe("Admin detail page regressions", () => {
  test("analytics resets pagination when switching audience segments", async ({
    page,
  }) => {
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
        userMetrics: {
          ltv: index + 10,
          churnRisk: index % 2 === 0 ? "low" : "medium",
        },
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
    const response = await page.goto("/admin/analytics", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await page
      .getByRole("button", { name: /读者分群|Audience segments/ })
      .click();
    await expect(
      page.getByText("all-user-1@example.com", { exact: true }),
    ).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.getByRole("button", { name: /下一页|Next/ }).click();
    await expect(
      page.getByText("all-user-21@example.com", { exact: true }),
    ).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(
      page.getByText(/第 2 页，共 2 页|Page 2 of 2/, { exact: false }),
    ).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.getByTestId("admin-analytics-segment-vip").click();
    await expect(
      page.getByText("vip-reader@example.com", { exact: true }),
    ).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(
      page.getByText(/第 1 页，共 1 页|Page 1 of 1/, { exact: false }),
    ).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/analytics", runtimeIssues);
  });

  test("series detail keeps legacy commercial fields out of the edit form and patch payload", async ({
    page,
  }) => {
    await primeAdminSession(page);
    await installAdminBaseMocks(page);

    let patchBody: Record<string, unknown> | null = null;

    await page.route("**/api/admin/series/series-qa-001", async (route) => {
      if (route.request().method() === "PATCH") {
        patchBody = JSON.parse(route.request().postData() || "{}") as Record<
          string,
          unknown
        >;
        await fulfillJson(route, {
          series: {
            id: "series-qa-001",
            title: "Regression Test Series Updated",
            type: "comic",
            status: "Ongoing",
            adult: false,
            isPublished: true,
            description:
              "An updated fixture series for admin detail validation.",
            author: "Studio North",
            genres: ["Action", "Drama"],
            coverUrl: "https://example.com/cover.jpg",
            coverTone: "moody",
            createdAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-03-10T10:00:00.000Z",
          },
        });
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
          author: "Studio North",
          genres: ["Action", "Drama"],
          coverUrl: "https://example.com/cover.jpg",
          coverTone: "moody",
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-10T10:00:00.000Z",
        },
      });
    });

    await page.route(
      "**/api/admin/series/series-qa-001/credits",
      async (route) => {
        await fulfillJson(route, {
          credits: [],
          creator: null,
          author: "Studio North",
        });
      },
    );

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/series/series-qa-001", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("button", { name: /编辑详情|Edit details/ }),
    ).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("关注数", { exact: true })).toHaveCount(0);
    await expect(page.getByText("浏览量", { exact: true })).toHaveCount(0);
    await expect(page.getByText("封面状态", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("简介状态", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await page.getByRole("button", { name: /编辑详情|Edit details/ }).click();

    await expect(page.getByLabel(/作品标题|Title/)).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByLabel("Default episode price")).toHaveCount(0);
    await expect(page.getByLabel(/Badge/)).toHaveCount(0);
    await expect(page.getByLabel(/Free-pass interval \(hours\)/)).toHaveCount(
      0,
    );

    await page
      .getByLabel(/作品标题|Title/)
      .fill("Regression Test Series Updated");
    await page
      .getByRole("button", { name: /保存更改|保存修改|Save changes/ })
      .click();

    await expect(
      page.getByText("作品详情已保存。", { exact: true }),
    ).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    expect(patchBody).not.toBeNull();
    expect(JSON.stringify(patchBody)).not.toContain("episodePrice");
    expect(JSON.stringify(patchBody)).not.toContain("ttfEnabled");
    expect(JSON.stringify(patchBody)).not.toContain("ttfIntervalHours");
    expect(JSON.stringify(patchBody)).not.toContain("badge");

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/series/series-qa-001", runtimeIssues);
  });

  test("series detail updates normalized creator credits through the dedicated credits endpoint", async ({
    page,
  }) => {
    await primeAdminSession(page);
    await installAdminBaseMocks(page);

    let creditsPatchBody: Record<string, unknown> | null = null;

    await page.route("**/api/admin/series/series-qa-001", async (route) => {
      await fulfillJson(route, {
        series: {
          id: "series-qa-001",
          title: "Regression Test Series",
          type: "comic",
          status: "Ongoing",
          adult: false,
          isPublished: true,
          description:
            "A fixture series for creator credit validation in the admin detail page.",
          author: "",
          genres: ["Action", "Drama"],
          coverUrl: "https://example.com/cover.jpg",
          coverTone: "moody",
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-10T10:00:00.000Z",
          creatorCredits: [],
          creator: null,
        },
      });
    });

    await page.route(
      "**/api/admin/series/series-qa-001/credits",
      async (route) => {
        if (route.request().method() === "PATCH") {
          creditsPatchBody = JSON.parse(
            route.request().postData() || "{}",
          ) as Record<string, unknown>;
          await fulfillJson(route, {
            credits: [
              {
                id: "credit-1",
                creatorId: "creator-1",
                slug: "studio-north",
                name: "Studio North",
                type: "studio",
                role: "studio",
                sortOrder: 0,
                isPrimary: true,
                isPublic: true,
              },
            ],
            publicCredits: [
              {
                creatorId: "creator-1",
                slug: "studio-north",
                name: "Studio North",
                type: "studio",
                role: "studio",
                sortOrder: 0,
                isPrimary: true,
              },
            ],
            creator: {
              label: "Studio North",
              slug: "studio-north",
              type: "studio",
              isFallback: false,
            },
            author: "Studio North",
          });
          return;
        }

        await fulfillJson(route, {
          credits: [],
          creator: null,
          author: "",
        });
      },
    );

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/series/series-qa-001#creator", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText("当前前台署名", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await page.getByTestId("admin-series-credits-add").click();
    await page.getByLabel("公开署名").first().fill("Studio North");
    await page.getByTestId("admin-series-credits-save").click();

    await expect(
      page.getByText("创作者署名已保存。", { exact: true }),
    ).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    expect(creditsPatchBody).not.toBeNull();
    expect(JSON.stringify(creditsPatchBody)).toContain("Studio North");
    expect(JSON.stringify(creditsPatchBody)).not.toContain("Story team");
    expect(JSON.stringify(creditsPatchBody)).not.toContain(
      "Creator details coming soon",
    );

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues(
      "/admin/series/series-qa-001#creator",
      runtimeIssues,
    );
  });

  test("episodes workspace supports content-first bulk edits and reorder actions", async ({
    page,
  }) => {
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

    await page.route(
      "**/api/admin/series/series-qa-001/episodes**",
      async (route) => {
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
      },
    );

    await page.route(
      "**/api/admin/series/series-qa-001/episodes/reorder",
      async (route) => {
        reorderCalls += 1;
        await fulfillJson(route, { episodes: [] });
      },
    );

    await page.route(
      "**/api/admin/series/series-qa-001/episodes/bulk",
      async (route) => {
        bulkCalls += 1;
        await fulfillJson(route, { episodes: [] });
      },
    );

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/series/series-qa-001/episodes", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: "Regression Test Series" }),
    ).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("当前章节数", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.getByLabel("选择章节 1").check();
    await expect(page.getByTestId("admin-episodes-bulk-edit")).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await page.getByTestId("admin-episodes-bulk-edit").click();

    await expect(page.getByLabel("批量点数价格")).toHaveCount(0);
    await page.getByLabel("批量试看页数").fill("9");
    await page.getByTestId("admin-episodes-bulk-apply").click();
    await expect.poll(() => bulkCalls).toBe(1);

    await page.getByTestId("admin-episodes-auto-renumber").click();
    await expect.poll(() => reorderCalls).toBe(1);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues(
      "/admin/series/series-qa-001/episodes",
      runtimeIssues,
    );
  });
});
