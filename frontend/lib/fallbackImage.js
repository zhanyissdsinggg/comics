const LEGACY_PLACEHOLDER_HOSTS = new Set([
  "placehold.co",
  "via.placeholder.com",
  "dummyimage.com",
  "img2.baidu.com",
]);

const LEGACY_INLINE_READER_MARKERS = [
  "Story preview artwork.",
  "Reader fallback",
  "Page preview",
  "Page unavailable",
  "CHAPTER",
];

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

function readInlineSvgPayload(value) {
  const normalized = String(value || "").trim();
  if (!normalized.startsWith("data:image/svg+xml")) {
    return "";
  }

  const commaIndex = normalized.indexOf(",");
  if (commaIndex < 0) {
    return "";
  }

  const payload = normalized.slice(commaIndex + 1);

  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
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

export function isLegacyInlineReaderPlaceholder(value) {
  const payload = readInlineSvgPayload(value);
  if (!payload) {
    return false;
  }

  return (
    LEGACY_INLINE_READER_MARKERS.some((marker) => payload.includes(marker)) ||
    /Episode\s*\d+\s*\|\s*Page\s*\d+/i.test(payload)
  );
}

export function readLegacyInlineReaderMeta(value) {
  const payload = readInlineSvgPayload(value);
  if (!payload || !isLegacyInlineReaderPlaceholder(value)) {
    return null;
  }

  const episodeMatch = payload.match(/Episode\s*(\d+)\s*\|\s*Page\s*(\d+)/i);

  return {
    episodeNumber: episodeMatch?.[1] || "",
    pageNumber: episodeMatch?.[2] || "",
  };
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

  if (
    isLegacyPlaceholderUrl(normalized) ||
    isLegacyInlineReaderPlaceholder(normalized)
  ) {
    return getFallbackImageUrl(options);
  }

  return normalized;
}
