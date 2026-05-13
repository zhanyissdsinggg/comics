const LEGACY_PLACEHOLDER_HOSTS = new Set([
  "placehold.co",
  "via.placeholder.com",
  "dummyimage.com",
  "img2.baidu.com",
]);

const DEFAULT_BASE_URL = "https://gush.local";

function toUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized, DEFAULT_BASE_URL);
  } catch {
    return null;
  }
}

function normalizeBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function isLegacyPlaceholderUrl(value) {
  const parsed = toUrl(value);
  if (!parsed) {
    return false;
  }

  return LEGACY_PLACEHOLDER_HOSTS.has(parsed.hostname);
}

export function readLegacyPlaceholderText(value) {
  const parsed = toUrl(value);
  if (!parsed || !LEGACY_PLACEHOLDER_HOSTS.has(parsed.hostname)) {
    return "";
  }

  return String(parsed.searchParams.get("text") || "")
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getFallbackImageUrl({
  kind = "cover",
  adult = false,
  variant = "",
} = {}) {
  const isAdult = normalizeBool(adult);
  const normalizedVariant = String(variant || "")
    .trim()
    .toLowerCase();

  if (kind === "banner") {
    return isAdult
      ? "/fallback/banner-adult.svg"
      : "/fallback/banner-default.svg";
  }

  if (kind === "reader") {
    return isAdult
      ? "/fallback/reader-page-adult.svg"
      : "/fallback/reader-page-default.svg";
  }

  if (kind === "avatar") {
    if (normalizedVariant === "reader") {
      return "/fallback/avatar-reader.svg";
    }
    if (normalizedVariant === "rose") {
      return "/fallback/avatar-rose.svg";
    }
    if (normalizedVariant === "teal") {
      return "/fallback/avatar-teal.svg";
    }
    if (normalizedVariant === "indigo") {
      return "/fallback/avatar-indigo.svg";
    }
    if (isAdult) {
      return "/fallback/avatar-adult.svg";
    }
    return "/fallback/avatar-default.svg";
  }

  return isAdult ? "/fallback/cover-adult.svg" : "/fallback/cover-default.svg";
}

export function resolveDisplayImageUrl(value, options = {}) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return getFallbackImageUrl(options);
  }

  if (isLegacyPlaceholderUrl(normalized)) {
    return getFallbackImageUrl(options);
  }

  return normalized;
}
