export function isNetworkToastMessage(message) {
  const normalized = String(message || "")
    .trim()
    .toLowerCase();

  return (
    normalized === "fetch failed" ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network error") ||
    normalized.includes("network request failed") ||
    normalized.includes("load failed")
  );
}

function isAdminUiPath() {
  if (typeof window === "undefined") {
    return false;
  }

  return String(window.location?.pathname || "").startsWith("/admin");
}

export function normalizeToastMessage(message) {
  const text = String(message || "").trim();

  if (!text) {
    return "";
  }

  if (isNetworkToastMessage(text)) {
    if (isAdminUiPath()) {
      return "加载失败，请检查网络后重试。";
    }
    return "Something did not load. Please try again.";
  }

  return text;
}

export function getToastLabel(type = "info", message = "") {
  if (isNetworkToastMessage(message)) {
    if (isAdminUiPath()) {
      return "连接";
    }
    return "Connection";
  }

  if (type === "success") {
    if (isAdminUiPath()) {
      return "已保存";
    }
    return "Saved";
  }

  if (type === "error") {
    if (isAdminUiPath()) {
      return "问题";
    }
    return "Problem";
  }

  if (type === "warning") {
    if (isAdminUiPath()) {
      return "提示";
    }
    return "Heads Up";
  }

  if (isAdminUiPath()) {
    return "更新";
  }
  return "Update";
}
