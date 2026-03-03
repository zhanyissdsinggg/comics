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

  // 使用DOMParser安全解析HTML，防止XSS攻击
  const parser = new DOMParser();
  let parsedDoc;
  try {
    parsedDoc = parser.parseFromString(code, "text/html");
  } catch (err) {
    console.error(`[tracking] Failed to parse snippet for slot ${slot}:`, err);
    return;
  }

  // 检查是否有解析错误
  if (parsedDoc.body.textContent.includes("XML Parsing Error")) {
    console.error(`[tracking] Invalid HTML in snippet for slot ${slot}`);
    return;
  }

  const container = document.createElement("div");
  container.setAttribute(DATA_ATTR, slot);

  // 安全地复制解析后的节点
  Array.from(parsedDoc.body.childNodes).forEach((node) => {
    container.appendChild(node.cloneNode(true));
  });

  // 提取script标签进行特殊处理
  const scripts = Array.from(container.querySelectorAll("script"));
  scripts.forEach((script) => script.parentNode?.removeChild(script));

  target.appendChild(container);

  // 重新创建script标签以确保执行
  scripts.forEach((script, index) => {
    const fresh = document.createElement("script");
    fresh.setAttribute(DATA_ATTR, `${slot}-script-${index}`);

    // 只复制安全的属性
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
