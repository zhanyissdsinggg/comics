export function normalizeCreatorName(name) {
  if (typeof name !== "string") {
    return "";
  }

  return name.replace(/\s+/g, " ").trim();
}

export function getCreatorDisplayName(name) {
  return normalizeCreatorName(name) || "Studio";
}

export function slugifyCreatorName(name) {
  const normalized = getCreatorDisplayName(name);
  const asciiSafe = normalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const slug = asciiSafe
    .replace(/&/g, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "studio";
}

export function buildCreatorPathFromSlug(slug) {
  const normalizedSlug = slugifyCreatorName(String(slug || ""));
  return `/creators/${encodeURIComponent(normalizedSlug)}`;
}

export function buildCreatorHref(name) {
  return buildCreatorPathFromSlug(slugifyCreatorName(name));
}

export function creatorMatchesSlug(name, slug) {
  if (!slug) {
    return false;
  }

  return slugifyCreatorName(name) === slugifyCreatorName(slug);
}

export function humanizeCreatorSlug(slug) {
  const normalized = String(slug || "")
    .replace(/-/g, " ")
    .trim();

  if (!normalized) {
    return "Studio";
  }

  return normalized.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}
