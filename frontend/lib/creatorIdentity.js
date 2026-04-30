import {
  buildCreatorHref,
  buildCreatorPathFromSlug,
  creatorMatchesSlug,
  normalizeCreatorName,
  slugifyCreatorName,
} from "./creators";

const TEAM_TOKENS = [
  "team",
  "works",
  "lab",
  "labs",
  "collective",
  "house",
  "project",
];
const STUDIO_TOKENS = ["studio"];
const PUBLIC_CREATOR_TYPES = new Set(["person", "team", "studio"]);
const GENERIC_CREATOR_PLACEHOLDER_PATTERNS = [
  /^story team$/i,
  /^creator details coming soon$/i,
  /^the team behind\b/i,
  /^team behind\b/i,
  /^the creators behind\b/i,
  /^unknown$/i,
  /^not listed$/i,
  /^n\/a$/i,
];

export const CREATOR_FALLBACK_LABEL = "";
export const CREATOR_FALLBACK_DETAIL = "";

export function isGenericCreatorPlaceholder(name) {
  const normalized = normalizeCreatorName(name);
  if (!normalized) {
    return true;
  }

  return GENERIC_CREATOR_PLACEHOLDER_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

export function inferCreatorCreditType(name) {
  const normalized = normalizeCreatorName(name).toLowerCase();
  if (!normalized) {
    return "fallback";
  }

  if (STUDIO_TOKENS.some((token) => normalized.includes(token))) {
    return "studio";
  }

  if (TEAM_TOKENS.some((token) => normalized.includes(token))) {
    return "team";
  }

  return "person";
}

function normalizeCreatorType(type, fallbackName = "") {
  const normalizedType = String(type || "")
    .trim()
    .toLowerCase();
  if (PUBLIC_CREATOR_TYPES.has(normalizedType)) {
    return normalizedType;
  }

  const inferredType = inferCreatorCreditType(fallbackName);
  return inferredType === "fallback" ? "person" : inferredType;
}

function createCreatorIdentity(source) {
  const hasObjectSource = Boolean(source && typeof source === "object");
  const rawName = hasObjectSource
    ? (source?.label ?? source?.name ?? "")
    : source;
  const normalizedName = normalizeCreatorName(rawName);
  const rawSlug = hasObjectSource ? String(source?.slug || "").trim() : "";
  const isFallbackSource = Boolean(hasObjectSource && source?.isFallback);

  if (
    !normalizedName ||
    isFallbackSource ||
    normalizedName === CREATOR_FALLBACK_LABEL ||
    isGenericCreatorPlaceholder(normalizedName)
  ) {
    return {
      hasPublicCredit: false,
      name: "",
      displayName: CREATOR_FALLBACK_LABEL,
      value: CREATOR_FALLBACK_LABEL,
      slug: "",
      href: "",
      creditType: "fallback",
      eyebrow: "Story credits",
      detail: CREATOR_FALLBACK_DETAIL,
    };
  }

  const slug = rawSlug || slugifyCreatorName(normalizedName);
  const creditType = normalizeCreatorType(
    hasObjectSource ? source?.type : "",
    normalizedName,
  );

  return {
    hasPublicCredit: true,
    name: normalizedName,
    displayName: normalizedName,
    value: normalizedName,
    slug,
    href: slug
      ? buildCreatorPathFromSlug(slug)
      : buildCreatorHref(normalizedName),
    creditType,
    eyebrow: normalizedName,
    detail: "Creator",
  };
}

function extractPrimarySeriesCreator(series) {
  if (!series || typeof series !== "object") {
    return null;
  }

  const directCreator = createCreatorIdentity(series?.creator);
  if (directCreator.hasPublicCredit) {
    return {
      label: directCreator.displayName,
      slug: directCreator.slug,
      type: directCreator.creditType,
      isFallback: false,
    };
  }

  const credits = Array.isArray(series?.creatorCredits)
    ? series.creatorCredits
    : [];
  const primaryCredit =
    credits.find(
      (credit) =>
        Boolean(credit?.isPrimary) && normalizeCreatorName(credit?.name),
    ) || credits.find((credit) => normalizeCreatorName(credit?.name));
  if (primaryCredit) {
    const creditIdentity = createCreatorIdentity({
      label: primaryCredit.name,
      slug: primaryCredit.slug,
      type: primaryCredit.type,
    });

    if (creditIdentity.hasPublicCredit) {
      return {
        label: creditIdentity.displayName,
        slug: creditIdentity.slug,
        type: creditIdentity.creditType,
        isFallback: false,
      };
    }
  }

  const authorName = normalizeCreatorName(series?.author);
  if (!authorName || isGenericCreatorPlaceholder(authorName)) {
    return null;
  }

  return {
    label: authorName,
    slug: "",
    type: inferCreatorCreditType(authorName),
    isFallback: false,
  };
}

function collectSeriesCreatorAliases(series) {
  const aliases = [];
  const primaryCreator = extractPrimarySeriesCreator(series);
  if (primaryCreator?.label) {
    aliases.push(primaryCreator.label);
  }
  if (primaryCreator?.slug) {
    aliases.push(primaryCreator.slug);
  }

  const directCreator = createCreatorIdentity(series?.creator);
  if (directCreator.hasPublicCredit) {
    aliases.push(directCreator.displayName, directCreator.slug);
  }

  const credits = Array.isArray(series?.creatorCredits)
    ? series.creatorCredits
    : [];
  credits.forEach((credit) => {
    const normalizedName = normalizeCreatorName(credit?.name);
    if (normalizedName) {
      aliases.push(normalizedName);
    }

    const normalizedSlug = String(credit?.slug || "").trim();
    if (normalizedSlug) {
      aliases.push(normalizedSlug);
    }
  });

  return Array.from(
    new Set(aliases.map((value) => String(value || "").trim()).filter(Boolean)),
  );
}

export function resolveCreatorIdentity(name) {
  return createCreatorIdentity(name);
}

export function resolveSeriesCreatorName(series) {
  const creatorIdentity = resolveSeriesCreatorIdentity(series);
  return creatorIdentity.hasPublicCredit ? creatorIdentity.displayName : "";
}

export function resolveSeriesCreatorIdentity(series) {
  return createCreatorIdentity(extractPrimarySeriesCreator(series));
}

export function seriesMatchesCreatorSlug(series, slug) {
  const normalizedSlug = slugifyCreatorName(slug);
  if (!normalizedSlug) {
    return false;
  }

  return collectSeriesCreatorAliases(series).some((alias) =>
    creatorMatchesSlug(alias, normalizedSlug),
  );
}
