import { expect, test } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { expectVisibleFocusIndicator } from "./support/keyboard";

test.describe("Header search", () => {
  test("should open quick paths on focus and close on outside click", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const searchInput = page.getByRole("searchbox", {
      name: "Search series, creators, or genres",
    });
    await searchInput.focus();

    await expect(page.getByText(/^Start with$/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Trending/i })).toBeVisible();

    await page.evaluate(() => {
      document.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          clientX: 8,
          clientY: 120,
        }),
      );
    });

    await expect(page.getByText(/^Start with$/)).toHaveCount(0);
    await expectNoRuntimeIssues("/", runtimeIssues);
  });

  test("should keep search discovery lanes reachable by keyboard in focus order", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const searchInput = page.getByRole("searchbox", {
      name: "Search series, creators, or genres",
    });
    const trendingLane = page.getByRole("button", { name: /Trending/i }).first();
    const finishedLane = page.getByRole("button", { name: /Finished series/i }).first();

    await searchInput.focus();
    await expect(searchInput).toBeFocused();
    await searchInput.press("Tab");
    await expect(trendingLane).toBeFocused();
    await expectVisibleFocusIndicator(trendingLane, "Search discovery Trending lane");

    await trendingLane.press("Tab");
    await expect(finishedLane).toBeFocused();
    await expectVisibleFocusIndicator(finishedLane, "Search discovery Finished series lane");

    await expectNoRuntimeIssues("/", runtimeIssues);
  });
});
