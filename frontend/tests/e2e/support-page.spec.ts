import { expect, test } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

test.describe("Support page", () => {
  test("guest support flow submits in-page without opening mail", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    let submittedPayload: Record<string, unknown> | null = null;

    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });

    await page.route("**/api/support", async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<
        string,
        unknown
      >;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    const response = await page.goto("/support", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: "Send a request" }),
    ).toBeVisible();
    await expect(page.locator("#support-topic")).toBeVisible();
    await expect(page.locator("#support-topic")).toContainText("Other");
    await expect(page.locator("#support-email")).toBeVisible();
    await expect(page.locator("#support-order-id")).toBeVisible();
    await expect(
      page.getByText("We'll reply in 1-2 business days."),
    ).toBeVisible();

    await page.selectOption("#support-topic", "billing");
    await page.fill("#support-email", "reader@example.com");
    await expect(page.locator("#support-subject")).toHaveValue("Billing issue");
    await page.fill(
      "#support-message",
      "Need a receipt for yesterday's purchase.",
    );
    await page.click("button[type='submit']");

    await expect(page.getByText("Request received")).toBeVisible();
    expect(submittedPayload).toMatchObject({
      topic: "billing",
      replyEmail: "reader@example.com",
      subject: "Billing issue",
    });
    expect(String(submittedPayload?.message || "")).toContain(
      "Reply email: reader@example.com",
    );
    await expectNoRuntimeIssues("/support", runtimeIssues);
  });

  test("order id query preloads the support form", async ({ page }) => {
    const response = await page.goto("/support?orderId=ord_12345", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("#support-order-id")).toHaveValue("ord_12345");
  });

  test("falls back to mailto when backend support submit is unavailable", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });

    await page.route("**/api/support", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "UNAVAILABLE" }),
      });
    });

    const response = await page.goto("/support", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await page.selectOption("#support-topic", "technical");
    await page.fill("#support-email", "reader@example.com");
    await page.fill("#support-subject", "Reader won't load");
    await page.fill("#support-message", "Chapter 12 freezes on open.");
    await page.click("button[type='submit']");

    await expect(page.getByText("Email backup ready")).toBeVisible();
    const mailtoLink = page.getByRole("link", { name: "Open email app" });
    await expect(mailtoLink).toBeVisible();
    await expect(mailtoLink).toHaveAttribute("href", /^mailto:/);
    await expectNoRuntimeIssues("/support", runtimeIssues);
  });
});
