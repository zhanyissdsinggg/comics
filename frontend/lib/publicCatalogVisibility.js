const BLOCKED_PUBLIC_TEXT_PATTERNS = [
  "demo series",
  "gush demo studio",
  "smoke test",
  "reader qa",
  "demo action",
  "demo episode",
  "demo genre",
  "platform smoke tests",
  "fixture",
  "placeholder",
];

const BLOCKED_PUBLIC_TOKEN_PATTERNS = ["demo", "fixture", "placeholder", "qa"];

const BLOCKED_PUBLIC_IDS = new Set(["demo-series", "fixture-series"]);

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function containsBlockedPublicText(value) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return false;
  }

  return BLOCKED_PUBLIC_TEXT_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );
}

export function containsBlockedPublicToken(value) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return false;
  }

  return BLOCKED_PUBLIC_TOKEN_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );
}

function arrayContainsBlockedText(values) {
  if (!Array.isArray(values)) {
    return false;
  }

  return values.some((value) => containsBlockedPublicText(value));
}

export function isBlockedPublicSeriesRecord(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const seriesId = normalizeValue(value.id);
  if (BLOCKED_PUBLIC_IDS.has(seriesId) || containsBlockedPublicToken(seriesId)) {
    return true;
  }

  return (
    containsBlockedPublicText(value.title) ||
    containsBlockedPublicText(value.description) ||
    containsBlockedPublicText(value.author) ||
    arrayContainsBlockedText(value.genres)
  );
}

export function isBlockedPublicCreatorRecord(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    containsBlockedPublicToken(value.id) ||
    containsBlockedPublicToken(value.slug) ||
    containsBlockedPublicText(value.name) ||
    containsBlockedPublicText(value.bio) ||
    containsBlockedPublicText(value.leadSummary) ||
    arrayContainsBlockedText(value.topGenres)
  );
}

export function isBlockedPublicCreatorSlug(value) {
  return containsBlockedPublicToken(value) || containsBlockedPublicText(value);
}

export function filterBlockedPublicSeries(items) {
  return (Array.isArray(items) ? items : []).filter(
    (item) => !isBlockedPublicSeriesRecord(item),
  );
}

export function filterBlockedPublicCreators(items) {
  return (Array.isArray(items) ? items : []).filter(
    (item) => !isBlockedPublicCreatorRecord(item),
  );
}

export function filterBlockedPublicGenres(items) {
  return (Array.isArray(items) ? items : []).filter(
    (item) => !containsBlockedPublicText(item),
  );
}

export function filterBlockedPublicKeywordItems(items) {
  return (Array.isArray(items) ? items : []).filter((item) => {
    if (!item) {
      return false;
    }

    if (typeof item === "string") {
      return !containsBlockedPublicText(item);
    }

    return ![
      item.label,
      item.value,
      item.hint,
      item.badge,
      item.keyword,
      item.term,
      item.name,
      item.query,
      item.title,
    ].some((value) => containsBlockedPublicText(value));
  });
}

export function filterBlockedPublicTextList(items) {
  return (Array.isArray(items) ? items : []).filter(
    (item) => !containsBlockedPublicText(item),
  );
}
