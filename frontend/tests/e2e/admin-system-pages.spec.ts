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

test.describe("Admin system page regressions", () => {
  test("settings page renders reference content without runtime issues", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, async () => false);

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const sectionHeadings = page.locator("section h2");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(sectionHeadings).toHaveCount(3, { timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(sectionHeadings.nth(0)).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(sectionHeadings.nth(2)).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(page.getByText(/HttpOnly Cookie/)).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
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

    const fromInput = page.locator('input[placeholder="no-reply@yourdomain.com"]');
    await expect(fromInput).toHaveValue("old@gush.test", { timeout: ADMIN_UI_TIMEOUT_MS });
    await fromInput.fill("latest@gush.test");

    const sendTestButton = page.getByRole("button", { name: /测试|娴嬭瘯|发送|鍙戦€?/ }).first();
    await expect(sendTestButton).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await sendTestButton.click();

    await expect(page.getByText(/已保存.*测试邮件|宸蹭繚瀛.*娴嬭瘯閭欢/)).toBeVisible({
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

    const addButton = page.getByRole("button", { name: /新增|鏂板/ });
    await expect(addButton).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await addButton.click();
    await addButton.click();

    const inputs = page.locator('input:not([type="file"])');
    await inputs.nth(0).fill("1");
    await inputs.nth(1).fill("United States");
    await inputs.nth(2).fill("+1");
    await inputs.nth(3).fill("Duplicate United States");

    await page.getByRole("button", { name: /保存|淇濆瓨/ }).click();
    await expect(page.getByText(/(\+1).*(不能重复|涓嶈兘閲嶅)|(不能重复|涓嶈兘閲嶅).*(\+1)/)).toBeVisible({
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

    await expect(page.locator("h1").first()).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });

    const inputs = page.locator('input:not([type="file"])');
    await inputs.nth(0).fill("night-run");
    await inputs.nth(1).fill("3");
    await inputs.nth(2).fill("4");
    await inputs.nth(3).fill("4");
    await page.getByRole("button", { name: /内容|生成|鍐呭|鐢熸垚/ }).first().click();

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
});
