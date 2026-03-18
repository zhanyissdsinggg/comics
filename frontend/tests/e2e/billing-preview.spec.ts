import { expect, test, type Page, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const BILLING_UI_TIMEOUT_MS = 20000;

const BILLING_DISABLED = {
  billingMode: "provider",
  purchaseActionsEnabled: false,
  subscriptionActionsEnabled: false,
  refundActionsEnabled: false,
};

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installBillingPreviewMocks(page: Page): Promise<void> {
  await page.route("**/api/promotions", async (route) => {
    await fulfillJson(route, { promotions: [] });
  });

  await page.route("**/api/billing/topups", async (route) => {
    await fulfillJson(route, {
      packages: [
        { packageId: "starter", paidPts: 50, bonusPts: 5, price: 3.99, currency: "USD", active: true, label: "Starter", tags: [] },
        { packageId: "value", paidPts: 200, bonusPts: 40, price: 14.99, currency: "USD", active: true, label: "Value", tags: ["best"] },
      ],
      billing: BILLING_DISABLED,
    });
  });

  await page.route("**/api/billing/plans", async (route) => {
    await fulfillJson(route, {
      plans: [
        { id: "basic", title: "Basic", discountPct: 10, dailyFreeUnlocks: 1, ttfMultiplier: 0.8, voucherPts: 2, price: 4.99, currency: "USD" },
        { id: "vip", title: "VIP", discountPct: 30, dailyFreeUnlocks: 3, ttfMultiplier: 0.5, voucherPts: 5, price: 12.99, currency: "USD" },
      ],
      billing: BILLING_DISABLED,
    });
  });
}

test.describe("Billing preview states", () => {
  test("store disables purchase buttons when checkout is preview-only", async ({ page }) => {
    await installBillingPreviewMocks(page);
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/store", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText("Checkout coming soon", { exact: true }).first()).toBeVisible({
      timeout: BILLING_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("button", { name: "Coming soon" }).first()).toBeDisabled({
      timeout: BILLING_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/store", runtimeIssues);
  });

  test("subscribe disables plan actions when secure billing is unavailable", async ({ page }) => {
    await installBillingPreviewMocks(page);
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/subscribe", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText("Starting membership is not live yet. You can still compare every tier here.")).toBeVisible({
      timeout: BILLING_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("button", { name: "Coming soon" }).first()).toBeDisabled({
      timeout: BILLING_UI_TIMEOUT_MS,
    });

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/subscribe", runtimeIssues);
  });
});
