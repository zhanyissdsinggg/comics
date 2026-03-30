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

async function primeAdminSession(
  page: Page,
  options: {
    localTrackingSnapshot?: { savedAt: string; values: Record<string, unknown> };
  } = {},
): Promise<void> {
  await page.addInitScript(
    ([trackingSnapshot]) => {
      if (trackingSnapshot) {
        window.localStorage.setItem("mn_tracking_settings_v1", JSON.stringify(trackingSnapshot));
      }
    },
    [options.localTrackingSnapshot ?? null],
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
      });
      return;
    }

    if (await handler(route, url)) {
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

test.describe("Admin config page regressions", () => {
  test("branding waits for hydrated server config before enabling saves", async ({ page }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/branding")) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await fulfillJson(route, {
          branding: {
            siteLogoUrl: "https://cdn.example.com/logo.png",
            faviconUrl: "https://cdn.example.com/favicon.png",
            homeBannerUrl: "https://cdn.example.com/banner.jpg",
          },
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/branding", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText(/正在加载品牌配置|Loading branding settings/)).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.locator('input[placeholder="https://.../logo.png"]')).toHaveValue(
      "https://cdn.example.com/logo.png",
      {
        timeout: ADMIN_UI_TIMEOUT_MS,
      },
    );
    await expect(page.getByRole("button", { name: /保存品牌配置|Save branding/ })).toBeEnabled({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/branding", runtimeIssues);
  });

  test("email jobs ignores stale responses when the admin switches views quickly", async ({ page }) => {
    await primeAdminSession(page);

    let allRequestCount = 0;

    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/email/jobs/retry")) {
        await fulfillJson(route, { ok: true });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/email/jobs/failed")) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        await fulfillJson(route, {
          jobs: [
            {
              id: "failed-job-1",
              status: "FAILED",
              to: "failed@example.com",
              subject: "Failed delivery",
              provider: "postmark",
              priority: 2,
              retries: 3,
              lastAttemptAt: "2026-03-12T08:00:00.000Z",
              error: "SMTP timeout",
            },
          ],
        });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/email/jobs")) {
        allRequestCount += 1;
        await fulfillJson(route, {
          jobs: [
            {
              id: `all-job-${allRequestCount}`,
              status: "SENT",
              to: "all@example.com",
              subject: "Queued delivery",
              provider: "postmark",
              priority: 1,
              retries: 0,
              lastAttemptAt: "2026-03-12T07:30:00.000Z",
              error: "",
            },
          ],
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/email-jobs", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText("all@example.com", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: /仅失败任务|Failed only/ }).dispatchEvent("click");
    await page.getByRole("button", { name: /全部任务|All jobs/ }).dispatchEvent("click");

    await page.waitForTimeout(900);
    await expect(page.getByText("all@example.com", { exact: true })).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("failed@example.com", { exact: true })).toHaveCount(0);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/email-jobs", runtimeIssues);
  });

  test("tracking keeps a newer local draft instead of overwriting it with older server data", async ({ page }) => {
    await primeAdminSession(page, {
      localTrackingSnapshot: {
        savedAt: "2026-03-12T10:00:00.000Z",
        values: {
          facebook: {
            "Pixel ID": "LOCAL-PIXEL",
          },
        },
      },
    });

    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/tracking")) {
        await fulfillJson(route, {
          config: {
            values: {
              facebook: {
                "Pixel ID": "SERVER-PIXEL",
              },
            },
            updatedAt: "2026-03-10T10:00:00.000Z",
          },
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/tracking", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator('input[value="LOCAL-PIXEL"]')).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.locator('input[value="SERVER-PIXEL"]')).toHaveCount(0);

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/admin/tracking", runtimeIssues);
  });
});
