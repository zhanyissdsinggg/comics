"use client";

export function shouldUseDocumentNavigation(pathname, href) {
  if (!pathname || !href) {
    return false;
  }

  const normalizedHref = String(href).trim();
  if (!normalizedHref.startsWith("/") || normalizedHref.startsWith("//")) {
    return false;
  }

  return pathname.startsWith("/adult");
}

export function navigateWithDocument(href) {
  if (typeof window === "undefined") {
    return;
  }

  window.location.assign(href);
}
