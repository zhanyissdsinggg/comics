import { normalizeGenreList } from "./coverPresentation";
import { isMatureGenreValue } from "./matureContent";

function normalizeToken(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalizeToken(value) {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatTitleCardFormatStatus(type, status) {
  const typeLabel = capitalizeToken(type);
  const statusLabel = capitalizeToken(status);

  return [typeLabel, statusLabel].filter(Boolean).join(" / ");
}

export function formatTitleCardGenres(genres, { limit = 3 } = {}) {
  return normalizeGenreList(genres)
    .filter((genre) => !isMatureGenreValue(genre))
    .slice(0, limit)
    .join(" · ");
}

export function formatTitleCardCreator(creatorName) {
  const normalized = normalizeToken(creatorName);
  return normalized ? `By ${normalized}` : "";
}
