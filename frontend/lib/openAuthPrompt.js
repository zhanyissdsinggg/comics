"use client";

export function openAuthPrompt(returnTo = "") {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("auth:open", {
      detail: {
        returnTo:
          returnTo ||
          `${window.location.pathname}${window.location.search || ""}`,
      },
    }),
  );
}
