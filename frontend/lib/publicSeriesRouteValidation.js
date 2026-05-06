import { isKnownPublicSeriesId } from "./publicSeriesCatalog";
import { isBlockedPublicSeriesIdentifier } from "./publicCatalogVisibility";

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isBlockedSeriesKey(value) {
  return isBlockedPublicSeriesIdentifier(normalizeString(value).toLowerCase());
}

export function isValidSeriesPayload(payload) {
  const series = payload?.series;
  if (!series || typeof series !== "object") {
    return false;
  }

  const id = normalizeString(series.id);
  const title = normalizeString(series.title);
  const type = normalizeString(series.type).toLowerCase();
  const episodes = Array.isArray(payload?.episodes) ? payload.episodes : null;

  if (!id || !title || !episodes) {
    return false;
  }

  if (type !== "comic" && type !== "novel") {
    return false;
  }

  if (isBlockedSeriesKey(id) || isBlockedSeriesKey(series.slug) || isBlockedSeriesKey(series.handle) || isBlockedSeriesKey(series.fixtureKey)) {
    return false;
  }

  return episodes.every((episode) => {
    const episodeId = normalizeString(episode?.id);
    const episodeSeriesId = normalizeString(episode?.seriesId);
    const episodeNumber = normalizeNumber(episode?.number);
    return (
      Boolean(episodeId) &&
      Boolean(episodeSeriesId) &&
      episodeSeriesId === id &&
      episodeNumber > 0 &&
      !isBlockedSeriesKey(episodeId)
    );
  });
}

export function shouldForceNotFoundForSeries(seriesId, payload) {
  const normalizedSeriesId = normalizeString(seriesId).toLowerCase();
  if (!normalizedSeriesId) {
    return true;
  }

  if (isBlockedSeriesKey(normalizedSeriesId)) {
    return true;
  }

  if (!payload) {
    return isKnownPublicSeriesId(normalizedSeriesId);
  }

  if (!isValidSeriesPayload(payload)) {
    return isKnownPublicSeriesId(normalizedSeriesId);
  }

  const resolvedSeries = payload.series || {};
  const candidateKeys = [
    normalizedSeriesId,
    normalizeString(resolvedSeries.id).toLowerCase(),
    normalizeString(resolvedSeries.slug).toLowerCase(),
    normalizeString(resolvedSeries.handle).toLowerCase(),
    normalizeString(resolvedSeries.fixtureKey).toLowerCase(),
  ].filter(Boolean);

  if (candidateKeys.some((key) => isBlockedSeriesKey(key))) {
    return true;
  }

  return false;
}

export function validateReaderPayload(seriesId, episodeId, payload) {
  const normalizedSeriesId = normalizeString(seriesId);
  const normalizedEpisodeId = normalizeString(episodeId);
  if (!normalizedSeriesId || !normalizedEpisodeId) {
    return false;
  }

  if (isBlockedSeriesKey(normalizedSeriesId) || isBlockedSeriesKey(normalizedEpisodeId)) {
    return false;
  }

  const series = payload?.series;
  const episode = payload?.episode;
  const episodes = Array.isArray(payload?.episodes) ? payload.episodes : [];
  if (!series || !episode) {
    return false;
  }

  if (normalizeString(series.id) !== normalizedSeriesId) {
    return false;
  }

  if (normalizeString(episode.id) !== normalizedEpisodeId) {
    return false;
  }

  if (normalizeString(episode.seriesId) !== normalizedSeriesId) {
    return false;
  }

  return episodes.some((item) => normalizeString(item?.id) === normalizedEpisodeId);
}

export function logSeriesInvariant(message, details = {}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.error(`[series-route] ${message}`, details);
}
