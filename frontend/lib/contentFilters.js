import {
  CONTENT_MODE_ADULT,
  CONTENT_MODE_NORMAL,
  normalizeContentMode,
} from "./contentMode.js";

const ADULT_KEYWORDS = [
  "18+",
  "18 plus",
  "18plus",
  "explicit",
  "mature",
  "nsfw",
  "r18",
  "r-18",
  "smut",
  "x-rated",
];

const SAFE_NORMAL_PHRASES = [
  "young adult",
  "young adults",
  "ya",
  "teen",
  "coming of age",
];

const ADULT_REGEX_PATTERNS = [
  /\b18\s*\+\b/,
  /\b18\s*plus\b/,
  /\bexplicit\b/,
  /\bmature\b/,
  /\bnsfw\b/,
  /\br\s*-\s*18\b/,
  /\br18\b/,
  /\bx\s*-\s*rated\b/,
  /\bsmut\b/,
];

const ADULT_FLAG_FIELDS = ["adult", "isAdult", "mature", "isMature", "nsfw"];

const ADULT_SIGNAL_FIELDS = [
  "rating",
  "ageRating",
  "contentRating",
  "category",
  "mode",
  "badge",
  "badges",
  "tags",
  "genres",
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function collectStringValues(value, depth = 0) {
  if (value == null || depth > 2) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStringValues(entry, depth + 1));
  }

  if (!isPlainObject(value)) {
    return [];
  }

  return [
    ...collectStringValues(value.label, depth + 1),
    ...collectStringValues(value.name, depth + 1),
    ...collectStringValues(value.slug, depth + 1),
    ...collectStringValues(value.title, depth + 1),
    ...collectStringValues(value.value, depth + 1),
  ];
}

function hasAdultKeyword(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return false;
  }

  const hasSafeNormalPhrase = SAFE_NORMAL_PHRASES.some((phrase) => {
    if (phrase === "ya") {
      return /\bya\b/.test(normalized);
    }
    return normalized.includes(phrase);
  });
  if (hasSafeNormalPhrase) {
    return false;
  }

  const hasExplicitAdultKeyword =
    ADULT_KEYWORDS.some((keyword) => normalized === keyword) ||
    ADULT_REGEX_PATTERNS.some((pattern) => pattern.test(normalized));
  if (hasExplicitAdultKeyword) {
    return true;
  }

  return (
    /\badults?\s+only\b/.test(normalized) || /\badults?\b/.test(normalized)
  );
}

function isTruthyAdultFlag(value) {
  if (value === true || value === 1) {
    return true;
  }

  const normalized = normalizeText(value);
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on" ||
    hasAdultKeyword(normalized)
  );
}

function hasAdultRatingSignal(field, value) {
  if (value == null) {
    return false;
  }

  if (
    (field === "ageRating" || field === "contentRating") &&
    typeof value === "number"
  ) {
    return Number.isFinite(value) && value >= 18;
  }

  return collectStringValues(value).some((entry) => hasAdultKeyword(entry));
}

function getSignalSources(item) {
  if (!isPlainObject(item)) {
    return [];
  }

  const sources = [item];
  if (isPlainObject(item.raw)) {
    sources.push(item.raw);
  }

  return sources;
}

function resolveModeValue(value) {
  const normalized = normalizeText(value);
  if (normalized === CONTENT_MODE_ADULT) {
    return CONTENT_MODE_ADULT;
  }
  if (normalized === CONTENT_MODE_NORMAL) {
    return CONTENT_MODE_NORMAL;
  }
  return "";
}

export function assertContentMode(mode) {
  if (mode !== CONTENT_MODE_NORMAL && mode !== CONTENT_MODE_ADULT) {
    throw new Error(
      `Invalid content mode "${String(mode)}". Expected "${CONTENT_MODE_NORMAL}" or "${CONTENT_MODE_ADULT}".`,
    );
  }

  return mode;
}

export function isAdultContent(item) {
  const sources = getSignalSources(item);
  if (sources.length === 0) {
    return false;
  }

  for (const source of sources) {
    for (const field of ADULT_FLAG_FIELDS) {
      if (isTruthyAdultFlag(source?.[field])) {
        return true;
      }
    }

    const explicitMode = resolveModeValue(source?.mode);
    if (explicitMode === CONTENT_MODE_ADULT) {
      return true;
    }

    for (const field of ADULT_SIGNAL_FIELDS) {
      if (hasAdultRatingSignal(field, source?.[field])) {
        return true;
      }
    }
  }

  return false;
}

export function isNormalContent(item) {
  if (!isPlainObject(item)) {
    return false;
  }

  return !isAdultContent(item);
}

export function matchesContentMode(item, contentMode) {
  const normalizedMode = normalizeContentMode(contentMode);
  return normalizedMode === CONTENT_MODE_ADULT
    ? isAdultContent(item)
    : isNormalContent(item);
}

export function filterContentByMode(items, contentMode) {
  const list = Array.isArray(items) ? items : [];
  return list.filter((item) => matchesContentMode(item, contentMode));
}

export function getContentModeQueryParam(contentMode) {
  return normalizeContentMode(contentMode) === CONTENT_MODE_ADULT ? "1" : "0";
}
