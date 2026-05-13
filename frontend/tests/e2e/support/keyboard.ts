import { expect, type Locator, type Page } from "@playwright/test";

type FocusAssertionOptions = {
  maxTabs?: number;
  label?: string;
  focusRingTarget?: Locator;
  resetBeforeTab?: boolean;
};

async function isFocused(locator: Locator): Promise<boolean> {
  return locator.evaluate(
    (element) => element === element.ownerDocument.activeElement,
  );
}

export async function resetKeyboardFocus(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
}

export async function tabUntilFocused(
  page: Page,
  locator: Locator,
  maxTabs = 40,
): Promise<void> {
  for (let index = 0; index < maxTabs; index += 1) {
    if (await isFocused(locator)) {
      return;
    }

    await page.keyboard.press("Tab");
  }

  await expect(locator).toBeFocused();
}

export async function expectVisibleFocusIndicator(
  locator: Locator,
  label = "focused control",
): Promise<void> {
  const styles = await locator.evaluate((element) => {
    const computed = window.getComputedStyle(element);

    return {
      boxShadow: computed.boxShadow,
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
      outlineColor: computed.outlineColor,
    };
  });

  const outlineWidth = Number.parseFloat(styles.outlineWidth || "0");
  const hasOutline = styles.outlineStyle !== "none" && outlineWidth > 0;
  const hasBoxShadow = Boolean(
    styles.boxShadow && styles.boxShadow !== "none" && styles.boxShadow !== "",
  );

  expect(
    hasOutline || hasBoxShadow,
    `${label} should expose a visible focus indicator. Styles: ${JSON.stringify(styles)}`,
  ).toBeTruthy();
}

export async function tabToAndExpectVisibleFocus(
  page: Page,
  locator: Locator,
  options: FocusAssertionOptions = {},
): Promise<void> {
  const {
    maxTabs = 40,
    label,
    focusRingTarget,
    resetBeforeTab = true,
  } = options;

  if (resetBeforeTab) {
    await resetKeyboardFocus(page);
  }

  await tabUntilFocused(page, locator, maxTabs);
  await expect(locator).toBeFocused();
  await expectVisibleFocusIndicator(focusRingTarget || locator, label);
}
