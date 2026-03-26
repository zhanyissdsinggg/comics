import { expect, test } from "@playwright/test";
import {
  LIBRARY_UI_TIMEOUT_MS,
  MOBILE_DEVICE,
  closeLibraryReadingStatePage,
  createLibraryReadingStateMock,
  getPageBodyText,
  openLibraryReadingStatePage,
} from "./support/libraryReadingState";
import { expectNoRuntimeIssues } from "./support/runtime";

test.describe("Library reading-state smoke", () => {
  test("signed-in mobile library should lead with continue reading and stable reading states", async ({
    browser,
  }) => {
    const state = createLibraryReadingStateMock();
    const openedPage = await openLibraryReadingStatePage(browser, state, "signed-in", "/library");
    const { page, runtimeIssues } = openedPage;

    await expect(page.getByRole("button", { name: "Continue Reading" })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("heading", { name: "Recent Activity" })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("heading", { name: "Saved Series" })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });

    const continueButtonBox = await page
      .getByRole("button", { name: "Continue Reading" })
      .boundingBox();
    expect(continueButtonBox).not.toBeNull();
    expect((continueButtonBox?.y || 0) + (continueButtonBox?.height || 0)).toBeLessThanOrEqual(
      MOBILE_DEVICE.viewport.height,
    );

    await expect(page.getByText("Your shelf is ready.")).toHaveCount(0);
    await expect(page.locator("#recent-activity")).toContainText("Last read Ep 1");
    await expect(page.locator("#saved-series")).toContainText("Unread");
    await expect(page.locator("#saved-series")).toContainText("Reading");
    await expect(page.locator("#saved-series")).toContainText("Read");

    const text = await getPageBodyText(page);
    expect(text).toContain("Continue Reading");
    expect(text).toContain("Recent Activity");
    expect(text).toContain("Saved Series");
    expect(text).toContain("Orbit Testament");
    expect(text).toContain("Paper Moon");

    await page.waitForTimeout(300);
    await expectNoRuntimeIssues("/library", runtimeIssues);
    await closeLibraryReadingStatePage(openedPage);
  });
});
