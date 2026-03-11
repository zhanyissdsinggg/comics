import { expect, type Page } from "@playwright/test";

const FATAL_CONSOLE_ERROR_PATTERNS = [
  /Minified React error/i,
  /React error #/i,
  /Unhandled Runtime Error/i,
  /Application error/i,
  /Something went wrong/i,
  /Element type is invalid/i,
];

export interface RuntimeIssueCollector {
  pageErrors: string[];
  consoleErrors: string[];
}

function normalizeErrorMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.stack || value.message;
  }

  return String(value ?? "Unknown runtime error");
}

export function collectRuntimeIssues(page: Page): RuntimeIssueCollector {
  const collector: RuntimeIssueCollector = {
    pageErrors: [],
    consoleErrors: [],
  };

  page.on("pageerror", (error) => {
    collector.pageErrors.push(normalizeErrorMessage(error));
  });

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text().trim();
    if (!text) {
      return;
    }

    if (FATAL_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(text))) {
      collector.consoleErrors.push(text);
    }
  });

  return collector;
}

export async function expectNoRuntimeIssues(
  route: string,
  collector: RuntimeIssueCollector,
): Promise<void> {
  expect(collector.pageErrors, `${route} emitted pageerror events`).toHaveLength(0);
  expect(collector.consoleErrors, `${route} emitted fatal console errors`).toHaveLength(0);
}
