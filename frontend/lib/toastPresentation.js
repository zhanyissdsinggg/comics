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

export function normalizeToastMessage(message) {
  const text = String(message || "").trim();

  if (!text) {
    return "";
  }

  if (isNetworkToastMessage(text)) {
    return "Something did not load. Please try again.";
  }

  return text;
}

export function getToastLabel(type = "info", message = "") {
  if (isNetworkToastMessage(message)) {
    return "Connection";
  }

  if (type === "success") {
    return "Saved";
  }

  if (type === "error") {
    return "Problem";
  }

  if (type === "warning") {
    return "Heads Up";
  }

  return "Update";
}
