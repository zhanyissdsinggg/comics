import { expect, test } from "@playwright/test";
import {
  LIBRARY_UI_TIMEOUT_MS,
  closeLibraryReadingStatePage,
  createLibraryReadingStateMock,
  getPageBodyText,
  openLibraryReadingStatePage,
} from "./support/libraryReadingState";
import { expectNoRuntimeIssues } from "./support/runtime";

test.describe("Library reading-state regression", () => {
  test("library should keep new progress and saved context across a signed-out gap and a fresh sign-in", async ({
    browser,
  }) => {
    const state = createLibraryReadingStateMock();

    const signedIn = await openLibraryReadingStatePage(browser, state, "signed-in", "/library");
    await expect(signedIn.page.getByRole("button", { name: "Continue Reading" })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    const signedInText = await getPageBodyText(signedIn.page);
    expect(signedInText).toContain("Continue Reading");
    expect(signedInText).toContain("Saved Series");

    await signedIn.page.goto("/series/series-fresh", { waitUntil: "domcontentloaded" });
    await expect(signedIn.page.getByRole("heading", { name: "Fresh Atlas" })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });

    await signedIn.page
      .getByRole("button", { name: /Read Free|Start Reading|Continue Reading/i })
      .first()
      .click();
    await signedIn.page.waitForURL(/\/read\/series-fresh\/series-fresh-e1/, {
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    await expect(signedIn.page.getByRole("button", { name: "Back", exact: true })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });

    await expect
      .poll(
        () =>
          state.history.some(
            (entry) => entry.seriesId === "series-fresh" && entry.episodeId === "series-fresh-e1",
          ),
        { timeout: LIBRARY_UI_TIMEOUT_MS },
      )
      .toBeTruthy();

    await signedIn.page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight * 0.55 });
    });

    await expect
      .poll(() => Number(state.progress["series-fresh"]?.percent || 0), {
        timeout: LIBRARY_UI_TIMEOUT_MS,
      })
      .toBeGreaterThan(0.1);

    await signedIn.page.goto("/library", { waitUntil: "domcontentloaded" });
    await expect(signedIn.page.getByRole("button", { name: "Continue Reading" })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    await expect(signedIn.page.locator("#recent-activity")).toContainText("Fresh Atlas");
    await expect(signedIn.page.locator("#saved-series")).toContainText("Fresh Atlas");
    await expect(signedIn.page.locator("#saved-series")).toContainText("Resume Ep 1");
    await expect(signedIn.page.locator("#saved-series")).toContainText("Paper Moon");

    await signedIn.page.waitForTimeout(300);
    await expectNoRuntimeIssues("/library", signedIn.runtimeIssues);
    await closeLibraryReadingStatePage(signedIn);

    const signedOut = await openLibraryReadingStatePage(browser, state, "signed-out", "/library");
    await expect(signedOut.page.getByRole("heading", { name: "Keep your shelf together." })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    await expect(signedOut.page.getByText("Continue Reading")).toHaveCount(0);
    await expect(signedOut.page.getByText("Recent Activity")).toHaveCount(0);
    await expect(signedOut.page.getByText("Saved Series")).toHaveCount(0);
    await expect(signedOut.page.getByText("Your shelf is ready.")).toHaveCount(0);
    await signedOut.page.waitForTimeout(300);
    await expectNoRuntimeIssues("/library", signedOut.runtimeIssues);
    await closeLibraryReadingStatePage(signedOut);

    const relogin = await openLibraryReadingStatePage(browser, state, "signed-in", "/library");
    await expect(relogin.page.getByRole("button", { name: "Continue Reading" })).toBeVisible({
      timeout: LIBRARY_UI_TIMEOUT_MS,
    });
    await expect(relogin.page.locator("#recent-activity")).toContainText("Fresh Atlas");
    await expect(relogin.page.locator("#saved-series")).toContainText("Fresh Atlas");
    await expect(relogin.page.locator("#saved-series")).toContainText("Paper Moon");

    const reloginText = await getPageBodyText(relogin.page);
    expect(reloginText).toContain("Continue Reading");
    expect(reloginText).toContain("Fresh Atlas");
    expect(reloginText).not.toContain("Your shelf is ready.");

    await relogin.page.waitForTimeout(300);
    await expectNoRuntimeIssues("/library", relogin.runtimeIssues);
    await closeLibraryReadingStatePage(relogin);
  });
});
