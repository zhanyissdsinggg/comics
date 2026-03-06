import { expect, test } from "@playwright/test";

test.describe("Guest progress behavior", () => {
  test("reader should not call progress APIs when user is not signed in", async ({
    page,
  }) => {
    const progressRequests = [];
    const progress401Responses = [];

    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/progress")) {
        progressRequests.push(url);
      }
    });

    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/progress") && response.status() === 401) {
        progress401Responses.push(`${response.status()} ${url}`);
      }
    });

    const response = await page.goto("/read/series-005/series-005e1", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight * 0.5 });
    });
    await page.waitForTimeout(4000);

    expect(progressRequests).toHaveLength(0);
    expect(progress401Responses).toHaveLength(0);
  });
});
