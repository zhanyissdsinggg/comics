import { siteConfig } from "./siteConfig";

export const MATURE_GENRE_LABEL = "Mature";

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function isMatureGenreValue(value) {
  const normalized = normalizeValue(value);
  return (
    normalized === "mature" ||
    normalized === "adult" ||
    normalized === "18+" ||
    normalized === "18 plus"
  );
}

export function hasMatureTitles(items) {
  return (Array.isArray(items) ? items : []).some((item) => Boolean(item?.adult));
}

export function shouldShowMatureFilter(items) {
  return siteConfig.matureContent.enabled || hasMatureTitles(items);
}

export function appendMatureGenre(items, options = {}) {
  const includeMature = options.includeMature ?? shouldShowMatureFilter(items);
  const values = Array.isArray(items) ? [...items] : [];
  if (!includeMature) {
    return values;
  }

  const alreadyIncluded = values.some((item) => isMatureGenreValue(item));
  if (alreadyIncluded) {
    return values;
  }

  return [...values, MATURE_GENRE_LABEL];
}

export function canReadMatureFromCookieStore(cookieStore) {
  const confirmed = String(cookieStore?.get?.("mn_adult_confirmed")?.value || "").trim() === "1";
  const enabled = String(cookieStore?.get?.("mn_adult_mode")?.value || "").trim() === "1";
  return confirmed && enabled;
}
