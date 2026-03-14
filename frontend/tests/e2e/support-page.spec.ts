import { expect, test } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

test.describe("Support page", () => {
  test("guest support flow shows contact fields and response expectations", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);

    const response = await page.goto("/support", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Support" })).toBeVisible();
    await expect(page.locator("#support-email")).toBeVisible();
    await expect(page.locator("#support-order-id")).toBeVisible();
    await expect(page.getByText("We usually reply within 1-2 business days.")).toBeVisible();

    await page.fill("#support-email", "reader@example.com");
    await page.fill("#support-subject", "Billing question");
    await page.fill("#support-message", "Need a receipt for yesterday's purchase.");

    await expect(page.getByRole("button", { name: "Copy Email Details" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Email App" })).toBeVisible();
    await expectNoRuntimeIssues("/support", runtimeIssues);
  });
});
