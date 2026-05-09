import { expect, test } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";
import { expectNoBasicA11yAuditIssues } from "./support/a11yAudit";
import { expectVisibleFocusIndicator } from "./support/keyboard";

test.describe("Mobile layout", () => {
  test("home should not overflow horizontally", async ({ page }) => {
    const runtime = collectRuntimeIssues(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await page.waitForTimeout(800);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );

    expect(overflow).toBeLessThanOrEqual(1);
    await expect(
      page.getByRole("heading", { name: "What are you in the mood for?" }),
    ).toBeVisible();
    await expectNoRuntimeIssues("/", runtime);
  });

  test("mobile header should hide desktop search shortcut hint", async ({ page }) => {
    const runtime = collectRuntimeIssues(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await page.waitForTimeout(500);
    await expect(page.getByText("Ctrl+K")).toHaveCount(0);
    await expect(page.getByText("?K")).toHaveCount(0);
    await expectNoRuntimeIssues("/", runtime);
  });

  test("mobile should render bottom tabs and reserve bottom space", async ({ page }) => {
    const runtime = collectRuntimeIssues(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const header = page.locator("header").first();
    const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });

    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Explore", exact: true })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Library", exact: true })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Rankings", exact: true })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Me", exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "Comics" })).toHaveCount(0);

    const bodyPaddingBottom = await page.evaluate(() =>
      Number.parseFloat(window.getComputedStyle(document.body).paddingBottom || "0")
    );

    expect(bodyPaddingBottom).toBeGreaterThan(60);
    await expectNoRuntimeIssues("/", runtime);
  });

  test("desktop should keep mobile bottom nav hidden", async ({ page }) => {
    const runtime = collectRuntimeIssues(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("navigation", { name: "Mobile bottom navigation" })).toBeHidden();
    await expectNoRuntimeIssues("/", runtime);
  });

  for (const { route, activeTab } of [
    { route: "/", activeTab: "Home" },
    { route: "/library", activeTab: "Library" },
    { route: "/search", activeTab: "Explore" },
    { route: "/account", activeTab: "Me" },
  ]) {
    test(`mobile bottom nav should highlight ${activeTab} on ${route}`, async ({ page }) => {
      const runtime = collectRuntimeIssues(page);
      await page.setViewportSize({ width: 390, height: 844 });

      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBeTruthy();

      const bottomNav = page.getByRole("navigation", { name: "Mobile bottom navigation" });
      const activeLink = bottomNav.getByRole("link", { name: activeTab, exact: true });
      await expect(bottomNav).toBeVisible();
      await expect(activeLink).toHaveAttribute("aria-current", "page");
      await activeLink.focus();
      await expect(activeLink).toBeFocused();
      await expectVisibleFocusIndicator(activeLink, `Mobile bottom nav ${activeTab} tab`);
      if (route === "/library") {
        await expectNoBasicA11yAuditIssues(page, route);
      }
      await expectNoRuntimeIssues(route, runtime);
    });
  }
});
