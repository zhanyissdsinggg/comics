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

export function isMatureTitle(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const rating = normalizeValue(value.rating);
  const badge = normalizeValue(value.badge);
  const genres = Array.isArray(value.genres) ? value.genres : [];
  const normalizedGenres = genres.map((item) => normalizeValue(item));

  return (
    Boolean(value.adult) ||
    Boolean(value.isAdult) ||
    rating === "18+" ||
    rating === "adult" ||
    rating === "mature" ||
    badge === "18+" ||
    normalizedGenres.some((item) => isMatureGenreValue(item))
  );
}

export function hasMatureTitles(items) {
  return (Array.isArray(items) ? items : []).some((item) => isMatureTitle(item));
}

export function shouldShowMatureFilter(items, flags = {}) {
  return Boolean(flags.enabled ?? siteConfig.matureContent.enabled) || hasMatureTitles(items);
}

export function appendMatureGenre(items, options = {}) {
  const includeMature =
    options.includeMature ?? shouldShowMatureFilter(items, options.flags);
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

export function canViewMatureContent(value) {
  if (value && typeof value.get === "function") {
    return canReadMatureFromCookieStore(value);
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const confirmed = Boolean(value.adultConfirmed);
  const enabled = Boolean(value.isAdultMode || value.matureVisibilityEnabled);
  return confirmed && enabled;
}

export function canReadMatureFromCookieStore(cookieStore) {
  const confirmed = String(cookieStore?.get?.("mn_adult_confirmed")?.value || "").trim() === "1";
  const enabled = String(cookieStore?.get?.("mn_adult_mode")?.value || "").trim() === "1";
  return confirmed && enabled;
}

export function getPublicGenres(items, options = {}) {
  const genres = Array.isArray(items) ? items : [];
  return appendMatureGenre(genres, options);
}
