import { expect, test } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { expectVisibleFocusIndicator } from "./support/keyboard";

test.describe("Header search", () => {
  test("should open quick paths on focus and close on outside click", async ({
    page,
  }) => {
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

    const featuredLane = page
      .getByRole("button", { name: /Featured Series/i })
      .first();
    const completedLane = page
      .getByRole("button", { name: /Completed Series/i })
      .first();

    await expect(featuredLane).toBeVisible();
    await expect(completedLane).toBeVisible();

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

    await expect(featuredLane).toHaveCount(0);
    await expectNoRuntimeIssues("/", runtimeIssues);
  });

  test("should keep search discovery lanes reachable by keyboard in focus order", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("cookie_consent", "accepted");
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const searchInput = page.getByRole("searchbox", {
      name: "Search series, creators, or genres",
    });
    const featuredLane = page
      .getByRole("button", { name: /Featured Series/i })
      .first();
    const completedLane = page
      .getByRole("button", { name: /Completed Series/i })
      .first();

    await searchInput.focus();
    await expect(searchInput).toBeFocused();
    await searchInput.press("Tab");
    await expect(featuredLane).toBeFocused();
    await expectVisibleFocusIndicator(
      featuredLane,
      "Search discovery Featured Series lane",
    );

    await featuredLane.press("Tab");
    await expect(completedLane).toBeFocused();
    await expectVisibleFocusIndicator(
      completedLane,
      "Search discovery Completed Series lane",
    );

    await expectNoRuntimeIssues("/", runtimeIssues);
  });
});
