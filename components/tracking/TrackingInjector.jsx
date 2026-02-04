"use client";

import { useEffect } from "react";
import { getApiBaseUrl } from "../../lib/apiClient";

const STORAGE_KEY = "mn_tracking_settings_v1";
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
  const container = document.createElement("div");
  container.setAttribute(DATA_ATTR, slot);
  container.innerHTML = code;
  const scripts = Array.from(container.querySelectorAll("script"));
  scripts.forEach((script) => script.parentNode?.removeChild(script));
  target.appendChild(container);
  scripts.forEach((script, index) => {
    const fresh = document.createElement("script");
    fresh.setAttribute(DATA_ATTR, `${slot}-script-${index}`);
    Array.from(script.attributes).forEach((attr) => {
      fresh.setAttribute(attr.name, attr.value);
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
  Object.entries(values).forEach(([groupId, groupValues]) => {
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
        return;
      }
    });
  });
  return { headSnippets, bodySnippets };
}

async function injectFromStorage() {
  if (typeof window === "undefined") {
    return;
  }
  let raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/tracking`, { credentials: "include" });
      const data = await response.json();
      if (data?.config?.values) {
        raw = JSON.stringify({ values: data.config.values });
        window.localStorage.setItem(STORAGE_KEY, raw);
      }
    } catch (err) {
      // ignore fetch errors
    }
  }
  if (!raw) {
    clearInjected();
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    const { headSnippets, bodySnippets } = buildSnippets(parsed?.values || {});
    clearInjected();
    headSnippets.forEach((snippet, index) => {
      appendSnippet(document.head, snippet, `head-${index}`);
    });
    bodySnippets.forEach((snippet, index) => {
      appendSnippet(document.body, snippet, `body-${index}`);
    });
  } catch (err) {
    // ignore parse errors
  }
}

export default function TrackingInjector() {
  useEffect(() => {
    injectFromStorage();
    const handler = (event) => {
      if (event.key === STORAGE_KEY) {
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
