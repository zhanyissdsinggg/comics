export function normalizeCreatorName(name) {
  if (typeof name !== "string") {
    return "";
  }

  return name.replace(/\s+/g, " ").trim();
}

export function getCreatorDisplayName(name) {
  return normalizeCreatorName(name);
}

export function slugifyCreatorName(name) {
  const normalized = normalizeCreatorName(name);
  if (!normalized) {
    return "";
  }

  const asciiSafe = normalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const slug = asciiSafe
    .replace(/&/g, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug;
}

export function buildCreatorPathFromSlug(slug) {
  const normalizedSlug = slugifyCreatorName(String(slug || ""));
  return normalizedSlug ? `/creators/${encodeURIComponent(normalizedSlug)}` : "/creators";
}

export function buildCreatorHref(name) {
  const slug = slugifyCreatorName(name);
  return slug ? buildCreatorPathFromSlug(slug) : "/creators";
}

export function creatorMatchesSlug(name, slug) {
  const normalizedName = slugifyCreatorName(name);
  const normalizedSlug = slugifyCreatorName(slug);

  if (!normalizedName || !normalizedSlug) {
    return false;
  }

  return normalizedName === normalizedSlug;
}

export function humanizeCreatorSlug(slug) {
  const normalizedSlug = slugifyCreatorName(String(slug || ""));
  if (!normalizedSlug) {
    return "";
  }

  const normalized = normalizedSlug
    .replace(/-/g, " ")
    .trim();

  return normalized.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}
