"use client";

import { useEffect } from "react";
import { apiGet } from "../../lib/apiClient";
import { primeAnalyticsProviders } from "../../lib/trackEvent";
import {
  TRACKING_SETTINGS_STORAGE_KEY,
  parseTrackingSettingsSnapshot,
  writeTrackingSettingsToWindow,
} from "../../lib/trackingSettings";

const DATA_ATTR = "data-tracking-slot";

function clearInjected() {
  if (typeof document === "undefined") {
    return;
  }
  document.querySelectorAll(`[${DATA_ATTR}]`).forEach((node) => node.remove());
}

function appendSnippet(target, code, slot) {
  if (!code || typeof document === "undefined") {
    return;
  }

  const parser = new DOMParser();
  let parsedDoc;
  try {
    parsedDoc = parser.parseFromString(code, "text/html");
  } catch (error) {
    console.error(
      `[tracking] Failed to parse snippet for slot ${slot}:`,
      error,
    );
    return;
  }

  if (parsedDoc.body.textContent.includes("XML Parsing Error")) {
    console.error(`[tracking] Invalid HTML in snippet for slot ${slot}`);
    return;
  }

  const container = document.createElement("div");
  container.setAttribute(DATA_ATTR, slot);

  Array.from(parsedDoc.body.childNodes).forEach((node) => {
    container.appendChild(node.cloneNode(true));
  });

  const scripts = Array.from(container.querySelectorAll("script"));
  scripts.forEach((script) => script.parentNode?.removeChild(script));

  target.appendChild(container);

  scripts.forEach((script, index) => {
    const fresh = document.createElement("script");
    fresh.setAttribute(DATA_ATTR, `${slot}-script-${index}`);

    const safeAttrs = ["src", "type", "async", "defer"];
    Array.from(script.attributes).forEach((attr) => {
      if (safeAttrs.includes(attr.name)) {
        fresh.setAttribute(attr.name, attr.value);
      }
    });

    if (script.textContent) {
      fresh.textContent = script.textContent;
    }
    target.appendChild(fresh);
  });
}

function buildSnippets(values) {
  const headSnippets = [];
  const bodySnippets = [];

  if (!values || typeof values !== "object") {
    return { headSnippets, bodySnippets };
  }

  Object.values(values).forEach((groupValues) => {
    if (!groupValues || typeof groupValues !== "object") {
      return;
    }

    Object.entries(groupValues).forEach(([key, value]) => {
      if (!value) {
        return;
      }

      const label = String(key).toLowerCase();
      if (label.includes("head")) {
        headSnippets.push(String(value));
        return;
      }

      if (label.includes("body")) {
        bodySnippets.push(String(value));
      }
    });
  });

  return { headSnippets, bodySnippets };
}

function applySnapshot(raw) {
  try {
    const parsed = parseTrackingSettingsSnapshot(raw);
    const { headSnippets, bodySnippets } = buildSnippets(parsed?.values || {});

    clearInjected();
    writeTrackingSettingsToWindow(parsed?.values || {});
    primeAnalyticsProviders();
    headSnippets.forEach((snippet, index) => {
      appendSnippet(document.head, snippet, `head-${index}`);
    });
    bodySnippets.forEach((snippet, index) => {
      appendSnippet(document.body, snippet, `body-${index}`);
    });
    return true;
  } catch {
    return false;
  }
}

async function injectFromStorage() {
  if (typeof window === "undefined") {
    return;
  }

  const cachedRaw = window.localStorage.getItem(TRACKING_SETTINGS_STORAGE_KEY);
  const hasLocalSnapshot = cachedRaw ? applySnapshot(cachedRaw) : false;

  try {
    const response = await apiGet("/api/tracking-config", {
      cacheMs: 60000,
      suppressAuthModal: true,
    });

    if (response.ok && response.data?.config?.values) {
      const nextRaw = JSON.stringify({ values: response.data.config.values });
      if (nextRaw !== cachedRaw) {
        window.localStorage.setItem(TRACKING_SETTINGS_STORAGE_KEY, nextRaw);
        applySnapshot(nextRaw);
      }
      return;
    }
  } catch {
    // ignore fetch errors
  }

  if (!hasLocalSnapshot) {
    clearInjected();
    writeTrackingSettingsToWindow({});
  }
}

export default function TrackingInjector() {
  useEffect(() => {
    injectFromStorage();

    const handler = (event) => {
      if (event.key === TRACKING_SETTINGS_STORAGE_KEY) {
        injectFromStorage();
      }
    };

    window.addEventListener("storage", handler);
    window.addEventListener("tracking:reload", injectFromStorage);

    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("tracking:reload", injectFromStorage);
    };
  }, []);

  return null;
}
