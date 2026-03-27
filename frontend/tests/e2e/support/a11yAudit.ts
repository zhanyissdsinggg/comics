import { expect, type Page } from "@playwright/test";

type MissingImageAlt = {
  src: string;
  alt: string;
};

type UnnamedIconControl = {
  tag: string;
  href: string;
  ariaLabel: string;
  title: string;
  text: string;
};

type A11yAuditResult = {
  missingImageAlt: MissingImageAlt[];
  unnamedIconControls: UnnamedIconControl[];
};

type BasicA11yAuditOptions = {
  ignoreImagesInside?: string[];
  ignoreControlsInside?: string[];
};

export async function expectNoBasicA11yAuditIssues(
  page: Page,
  routeLabel: string,
  options: BasicA11yAuditOptions = {},
): Promise<void> {
  const result = await page.evaluate<A11yAuditResult, BasicA11yAuditOptions>((auditOptions) => {
    const normalizeText = (value: string | null | undefined) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();

    const hasReadableText = (value: string) => /[A-Za-z\u00C0-\u024F\u4E00-\u9FFF]/.test(value);

    const isVisible = (element: Element) => {
      const node = element as HTMLElement;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();

      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        !node.hidden &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const isIgnoredByClosestSelector = (element: Element, selectors: string[] = []) =>
      selectors.some((selector) => {
        try {
          return Boolean(element.closest(selector));
        } catch {
          return false;
        }
      });

    const missingImageAlt = Array.from(document.querySelectorAll("img"))
      .filter((image) => isVisible(image))
      .filter((image) => !isIgnoredByClosestSelector(image, auditOptions.ignoreImagesInside))
      .map((image) => ({
        src: normalizeText(image.getAttribute("src")),
        alt: normalizeText(image.getAttribute("alt")),
      }))
      .filter((image) => !image.alt);

    const unnamedIconControls = Array.from(document.querySelectorAll("button, a[href]"))
      .filter((control) => isVisible(control))
      .filter((control) => !isIgnoredByClosestSelector(control, auditOptions.ignoreControlsInside))
      .filter((control) => control.querySelector("svg"))
      .map((control) => {
        const text = normalizeText(control.textContent);
        return {
          tag: control.tagName.toLowerCase(),
          href: normalizeText(control.getAttribute("href")),
          ariaLabel: normalizeText(control.getAttribute("aria-label")),
          title: normalizeText(control.getAttribute("title")),
          text,
        };
      })
      .filter((control) => !control.ariaLabel && !control.title && !hasReadableText(control.text));

    return {
      missingImageAlt,
      unnamedIconControls,
    };
  }, options);

  expect(
    result.missingImageAlt,
    `${routeLabel} has visible images without alt text: ${JSON.stringify(result.missingImageAlt, null, 2)}`,
  ).toHaveLength(0);

  expect(
    result.unnamedIconControls,
    `${routeLabel} has visible icon controls without an accessible name: ${JSON.stringify(result.unnamedIconControls, null, 2)}`,
  ).toHaveLength(0);
}
