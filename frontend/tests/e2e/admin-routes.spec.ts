import { expect, test, type Page, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const ADMIN_ACCESS_TOKEN = "e2e-admin-access-token";
const ADMIN_REFRESH_TOKEN = "e2e-admin-refresh-token";
const ADMIN_UI_TIMEOUT_MS = 15000;

const ADMIN_ROUTE_CASES = [
  {
    route: "/admin/users",
    emptyStateMessage: "\u6682\u65e0\u7528\u6237",
  },
  {
    route: "/admin/support",
    emptyStateMessage: "\u6682\u65e0\u5de5\u5355",
  },
  {
    route: "/admin/orders",
    emptyStateMessage: "\u6682\u65e0\u8ba2\u5355",
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

async function installAdminApiMocks(page: Page): Promise<void> {
  await page.route("**/api/health", async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route("**/api/docs-json", async (route) => {
    await fulfillJson(route, {
      paths: {
        "/api/admin/support": {},
        "/api/admin/support/{id}/reply": {},
        "/api/admin/support/{id}/close": {},
        "/api/admin/support/{id}": {},
      },
    });
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
      await fulfillJson(route, { users: [] });
      return;
    }

    if (pathname.endsWith("/api/admin/support")) {
      await fulfillJson(route, { support: [] });
      return;
    }

    if (pathname.endsWith("/api/admin/orders")) {
      await fulfillJson(route, { orders: [] });
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
});