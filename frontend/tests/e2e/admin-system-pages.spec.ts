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
      await fulfillJson(route, { success: true, valid: true, session: MOCK_ADMIN_SESSION });
      return;
    }

    if (pathname.endsWith("/api/admin/auth/refresh")) {
      await fulfillJson(route, { success: true, session: MOCK_ADMIN_SESSION });
      return;
    }

    if (await handler(route, url)) {
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

test.describe("Admin system page regressions", () => {
  test("settings page renders reference content without runtime issues", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, async () => false);

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: /系统设置|System Settings/ })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText(/后台访问|Admin access/).first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("heading", { name: /成员会话与登录凭证|Member session/ })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("heading", { name: /后台成员体系|Admin members/ })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText(/ADMIN_KEYS/i).first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText(/安全 Cookie|secure cookie/i)).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.waitForTimeout(1200);
    await expect(page.getByText("We use cookies", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Install Gush App", { exact: true })).toHaveCount(0);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/settings", runtimeIssues);
  });

  test("email settings saves the latest draft before sending a test email", async ({ page }) => {
    await primeAdminSession(page);

    const savePayloads: Record<string, unknown>[] = [];
    const testPayloads: Record<string, unknown>[] = [];

    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/email") && route.request().method() === "GET") {
        await fulfillJson(route, {
          config: {
            provider: "console",
            from: "old@gush.test",
            webhookUrl: "",
            resendApiKey: "********",
            sendgridApiKey: "",
            smsWebhookUrl: "",
            adminNotifyEmail: "alerts@gush.test",
            testRecipient: "qa@gush.test",
          },
        });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/email") && route.request().method() === "POST") {
        const payload = JSON.parse(route.request().postData() || "{}") as Record<string, unknown>;
        savePayloads.push(payload);
        await fulfillJson(route, {
          config: {
            ...payload,
            resendApiKey: payload.resendApiKey ? "********" : "",
            sendgridApiKey: payload.sendgridApiKey ? "********" : "",
            smsWebhookUrl: payload.smsWebhookUrl ? "********" : "",
          },
        });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/email/test")) {
        testPayloads.push(JSON.parse(route.request().postData() || "{}") as Record<string, unknown>);
        await fulfillJson(route, { ok: true });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/email-settings", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const fromInput = page.getByTestId("admin-email-from-input");
    await expect(fromInput).toHaveValue("old@gush.test", { timeout: ADMIN_UI_TIMEOUT_MS });
    await fromInput.fill("latest@gush.test");

    const sendTestButton = page.getByTestId("admin-email-send-test");
    await expect(sendTestButton).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await sendTestButton.click();

    await expect.poll(() => savePayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS }).toBe(1);
    await expect.poll(() => testPayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS }).toBe(1);
    expect(savePayloads[0]).toEqual(expect.objectContaining({ from: "latest@gush.test", testRecipient: "qa@gush.test" }));
    expect(testPayloads).toEqual([{ to: "qa@gush.test" }]);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/email-settings", runtimeIssues);
  });

  test("regions blocks duplicate dial codes before save", async ({ page }) => {
    await primeAdminSession(page);

    let saveRequests = 0;

    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/regions")) {
        if (route.request().method() === "GET") {
          await fulfillJson(route, { config: { countryCodes: [], lengthRules: {} } });
          return true;
        }

        saveRequests += 1;
        await fulfillJson(route, { config: { countryCodes: [], lengthRules: {} } });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/regions", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const addButton = page.getByRole("button", { name: /新增条目|Add entry/ });
    await expect(addButton).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await addButton.click();
    await addButton.click();

    const inputs = page.locator('input:not([type="file"])');
    await inputs.nth(0).fill("1");
    await inputs.nth(1).fill("United States");
    await inputs.nth(2).fill("+1");
    await inputs.nth(3).fill("Duplicate United States");

    await page.getByRole("button", { name: /保存更改|保存修改|Save changes/ }).click();
    await expect(page.getByText(/国际区号不能重复：\+1。|Country calling codes must be unique: \+1\./)).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    expect(saveRequests).toBe(0);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/regions", runtimeIssues);
  });

  test("content generator submits custom settings and renders the returned summary", async ({ page }) => {
    await primeAdminSession(page);

    const payloads: Record<string, unknown>[] = [];

    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/generate-content")) {
        payloads.push(JSON.parse(route.request().postData() || "{}") as Record<string, unknown>);
        await fulfillJson(route, {
          success: true,
          runId: "run-custom-1",
          comicsCount: 3,
          novelsCount: 3,
          totalEpisodes: 24,
          duration: 1.23,
          settings: {
            seriesPerType: 3,
            minEpisodes: 4,
            maxEpisodes: 4,
          },
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/content-generator", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: /演示内容生成器|Demo Content Generator/ })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    const inputs = page.locator('input:not([type="file"])');
    await inputs.nth(0).fill("night-run");
    await inputs.nth(1).fill("3");
    await inputs.nth(2).fill("4");
    await inputs.nth(3).fill("4");
    await page.getByRole("button", { name: /生成内容|Generate content/ }).click();

    await expect.poll(() => payloads.length).toBe(1);
    expect(payloads).toEqual([
      {
        seed: "night-run",
        seriesPerType: 3,
        minEpisodes: 4,
        maxEpisodes: 4,
      },
    ]);

    const resultSection = page.locator("section").filter({ hasText: /run-custom-1/ }).last();
    await expect(resultSection).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(resultSection).toContainText(/run-custom-1/);
    await expect(resultSection).toContainText(/24/);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/content-generator", runtimeIssues);
  });

  test("members workspace syncs slots and updates member status without runtime issues", async ({ page }) => {
    await primeAdminSession(page);

    const syncPayloads: Array<Record<string, unknown>> = [];
    const statusPayloads: Array<Record<string, unknown>> = [];

    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/members/meta")) {
        await fulfillJson(route, {
          keySlots: [
            {
              slot: 1,
              configuredRole: "content_admin",
              assignedMemberId: "member-1",
              assignedMemberName: "内容小组",
              missing: false,
            },
          ],
        });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/members") && route.request().method() === "GET") {
        await fulfillJson(route, {
          members: [
            {
              id: "member-1",
              name: "内容小组",
              email: "content@gush.test",
              role: "content_admin",
              status: "active",
              source: "manual",
              keySlot: 1,
              keySlotStatus: "assigned",
              totpEnabled: true,
              hasTotpSecret: true,
              lastLoginAt: "2026-03-12T08:00:00.000Z",
              createdAt: "2026-03-10T08:00:00.000Z",
              notes: "",
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
        });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/members/sync-env")) {
        syncPayloads.push(JSON.parse(route.request().postData() || "{}") as Record<string, unknown>);
        await fulfillJson(route, { created: 1 });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/members/member-1/status")) {
        statusPayloads.push(JSON.parse(route.request().postData() || "{}") as Record<string, unknown>);
        await fulfillJson(route, { ok: true });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/members", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "后台成员" })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("heading", { name: "成员目录" })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("内容小组", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: /同步槽位/ }).click();
    await expect.poll(() => syncPayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS }).toBe(1);
    await expect(page.getByText(/已同步环境密钥槽位，本次新增 1 个成员占位。/)).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: /停用/ }).click();
    await expect.poll(() => statusPayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS }).toBe(1);
    expect(statusPayloads[0]).toEqual({ status: "disabled" });
    await expect(page.getByText(/成员已停用。/)).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/members", runtimeIssues);
  });

  test("interactive stories workspace supports filtering and node jumps without runtime issues", async ({ page }) => {
    await primeAdminSession(page);

    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/interactive-stories") && route.request().method() === "GET") {
        await fulfillJson(route, {
          stories: [
            {
              id: "story-1",
              slug: "midnight-archive",
              title: "午夜档案馆",
              isPublished: false,
              _count: { nodes: 2, progress: 5 },
              series: { title: "档案馆" },
            },
          ],
        });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/interactive-stories/story-1/validation")) {
        await fulfillJson(route, {
          validation: {
            ok: true,
            errors: 0,
            warnings: 0,
            issues: { errors: [], warnings: [] },
          },
        });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/interactive-stories/story-1")) {
        await fulfillJson(route, {
          story: {
            id: "story-1",
            slug: "midnight-archive",
            title: "午夜档案馆",
            seriesId: "series-011",
            description: "悬疑、试探与风险同时推进的分支故事。",
            baseContext: "你在午夜值班时收到了第一封匿名来信。",
            initialState: { trust: 0, risk: 1, clues: 0 },
            isPublished: false,
            aiEnabled: true,
            initialNodeId: "node-1",
            series: { title: "档案馆" },
            nodes: [
              {
                id: "node-1",
                nodeKey: "intro-01",
                title: "午夜来信",
                sortOrder: 1,
                baseContext: "值班室里只剩你一个人。",
                basePrompt: "突出不安和悬疑气氛。",
                fallbackText: "你先压住呼吸，继续观察信封。",
                requiredFlags: [],
                blockedFlags: [],
                stateEffects: { risk: 1 },
                isEnding: false,
                aiEnabled: true,
                choices: [
                  {
                    id: "choice-1",
                    choiceKey: "open-letter",
                    label: "拆开信封",
                    description: "看看信里写了什么。",
                    targetNodeId: "node-2",
                    sortOrder: 1,
                    requiredFlags: [],
                    blockedFlags: [],
                    stateEffects: { clues: 1 },
                  },
                ],
              },
              {
                id: "node-2",
                nodeKey: "hallway-02",
                title: "走廊脚步声",
                sortOrder: 2,
                baseContext: "走廊另一头传来脚步声。",
                basePrompt: "节奏更紧，信息更少。",
                fallbackText: "你把信塞进口袋，慢慢转向门口。",
                requiredFlags: [],
                blockedFlags: [],
                stateEffects: { trust: -1 },
                isEnding: false,
                aiEnabled: true,
                choices: [],
              },
            ],
          },
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/interactive-stories", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText("互动小说创作台", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("heading", { name: "午夜档案馆" })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: /节点编排/ }).click();
    await expect(page.getByRole("heading", { name: /节点地图/ })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    const searchInput = page.getByPlaceholder("搜索节点标题、Key、分支文案");
    await searchInput.fill("走廊");
    const hallwayNodeCard = page.locator("button").filter({ hasText: "走廊脚步声" }).first();
    const introNodeCard = page.locator("button").filter({ hasText: "午夜来信" }).first();
    await expect(hallwayNodeCard).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(introNodeCard).toHaveCount(0);

    await searchInput.fill("");
    await page.locator("button").filter({ hasText: "午夜来信" }).first().click();
    const jumpButton = page.getByRole("button", { name: /跳到 走廊脚步声/ }).first();
    await expect(jumpButton).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await jumpButton.click();
    await expect(page.locator('input[value="走廊脚步声"]').first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/interactive-stories", runtimeIssues);
  });
});
