import { expect, test, type Page, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const ADMIN_ACCESS_TOKEN = "e2e-admin-access-token";
const ADMIN_REFRESH_TOKEN = "e2e-admin-refresh-token";
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
  await page.addInitScript(
    ([accessToken, refreshToken]) => {
      window.localStorage.setItem("admin_token", accessToken);
      window.localStorage.setItem("admin_refresh_token", refreshToken);
    },
    [ADMIN_ACCESS_TOKEN, ADMIN_REFRESH_TOKEN],
  );
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
      await fulfillJson(route, {
        success: true,
        accessToken: ADMIN_ACCESS_TOKEN,
        refreshToken: ADMIN_REFRESH_TOKEN,
      });
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

    await expect(page.getByRole("heading", { name: "系统设置" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("后台访问", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("指标规则", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.waitForTimeout(1200);
    await expect(page.getByText("We use cookies", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Install Gush App", { exact: true })).toHaveCount(0);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/settings", runtimeIssues);
  });

  test("email settings saves the latest draft before sending a test email", async ({ page }) => {
    await primeAdminSession(page);

    const savePayloads = [];
    const testPayloads = [];

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
        const payload = JSON.parse(route.request().postData() || "{}");
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
        testPayloads.push(JSON.parse(route.request().postData() || "{}"));
        await fulfillJson(route, { ok: true });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/email-settings", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("main").getByRole("heading", { name: "邮件设置" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.getByLabel("发件地址").fill("latest@gush.test");
    await expect(page.getByRole("button", { name: "保存并发送测试" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.getByRole("button", { name: "保存并发送测试" }).click();

    await expect(page.getByText("邮件设置已保存，并已发送测试邮件。", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    expect(savePayloads).toHaveLength(1);
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

    await expect(page.getByText("还没有配置任何国家区号。", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.getByRole("button", { name: "新增条目" }).click();
    await page.getByRole("button", { name: "新增条目" }).click();

    const codeInputs = page.locator('input[placeholder="+1"]');
    const labelInputs = page.locator('input[placeholder="美国"]');
    await codeInputs.nth(0).fill("1");
    await labelInputs.nth(0).fill("美国");
    await codeInputs.nth(1).fill("+1");
    await labelInputs.nth(1).fill("重复美国");

    await page.getByRole("button", { name: "保存更改" }).click();
    await expect(page.getByText("国家区号不能重复：+1。", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    expect(saveRequests).toBe(0);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/regions", runtimeIssues);
  });

  test("content generator submits custom settings and renders the returned summary", async ({ page }) => {
    await primeAdminSession(page);

    const payloads = [];

    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/generate-content")) {
        payloads.push(JSON.parse(route.request().postData() || "{}"));
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

    await expect(page.getByRole("heading", { name: "演示内容生成器" })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await page.getByLabel("种子").fill("night-run");
    await page.getByLabel("每种类型作品数").fill("3");
    await page.getByLabel("最少章节数").fill("4");
    await page.getByLabel("最多章节数").fill("4");
    await page.getByRole("button", { name: "生成内容" }).click();

    await expect.poll(() => payloads.length).toBe(1);
    expect(payloads).toEqual([
      {
        seed: "night-run",
        seriesPerType: 3,
        minEpisodes: 4,
        maxEpisodes: 4,
      },
    ]);
    await expect(page.getByText("生成完成，任务编号：run-custom-1。", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("任务编号：run-custom-1", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("每种类型作品数：3", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("最少章节数：4", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText("最多章节数：4", { exact: true })).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/content-generator", runtimeIssues);
  });
});
