import { resolveSeriesCreatorName } from "../creatorIdentity";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseLatestNumber(value) {
  if (!value) {
    return 0;
  }
  const match = String(value).match(/(\d+)/);
  if (!match) {
    return 0;
  }
  return Number.parseInt(match[1], 10) || 0;
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getEpisodeCount(series) {
  return Math.max(0, Number(series?.episodeCount || 0));
}

function isRecentlyUpdated(series, days = 21) {
  const updatedAt = Date.parse(series?.updatedAt || "");
  if (Number.isNaN(updatedAt)) {
    return false;
  }

  return updatedAt >= Date.now() - days * DAY_MS;
}

function getSeriesBadge(series, override = "") {
  if (override) {
    return override;
  }
  if (normalizeStatus(series?.status) === "completed") {
    return "Completed";
  }
  if (isRecentlyUpdated(series, 14)) {
    return "Updated";
  }
  if (getEpisodeCount(series) > 0 && getEpisodeCount(series) <= 12) {
    return "Start here";
  }
  return "";
}

function mapSeriesCard(series, subtitle, badgeOverride = "", extra = {}) {
  return {
    id: series.id,
    seriesId: series.id,
    title: series.title,
    author: resolveSeriesCreatorName(series),
    subtitle: subtitle || series.status || "Series",
    type: series.type || "",
    seriesType: series.type || "",
    status: series.status || "",
    genres: Array.isArray(series.genres) ? series.genres : [],
    coverTone: series.coverTone,
    coverUrl: series.coverUrl,
    badge: getSeriesBadge(series, badgeOverride),
    adult: Boolean(series.adult),
    ...extra,
  };
}

function getLastInteraction(events, types) {
  return (events || []).find((event) => types.includes(event.type)) || null;
}

function scoreSeries(targetGenres, series) {
  const overlap =
    Array.isArray(series.genres) && Array.isArray(targetGenres)
      ? series.genres.filter((genre) => targetGenres.includes(genre)).length
      : 0;
  const episodeCount = getEpisodeCount(series);
  const completionBonus = normalizeStatus(series?.status) === "completed" ? 2 : 0;
  const recencyBonus = isRecentlyUpdated(series, 21) ? 2 : 0;

  return overlap * 3 + Math.min(episodeCount, 24) / 6 + completionBonus + recencyBonus;
}

function getEditorialScore(series) {
  const updatedAt = Date.parse(series?.updatedAt || "");
  const updatedAtScore = Number.isNaN(updatedAt) ? 0 : updatedAt;
  const startHereBonus =
    getEpisodeCount(series) > 0 && getEpisodeCount(series) <= 24 ? 10 * DAY_MS : 0;
  const completionBonus =
    normalizeStatus(series?.status) === "completed" ? 8 * DAY_MS : 0;

  return updatedAtScore + startHereBonus + completionBonus;
}

export function recommendRails(catalog, behavior, progressMap, options = {}) {
  const events = behavior?.events || [];
  const isAdultMode = Boolean(options.isAdultMode);
  const safeCatalog = (catalog || []).filter((series) =>
    isAdultMode ? series.adult : !series.adult
  );

  const continueRail = Object.entries(progressMap || {})
    .map(([seriesId, progress]) => {
      const series = safeCatalog.find((item) => item.id === seriesId);
      if (!series) {
        return null;
      }
      const lastEpisodeId = progress?.lastEpisodeId || "";
      return mapSeriesCard(series, lastEpisodeId ? `Episode ${lastEpisodeId}` : "Continue reading", "Continue", {
        progressPercent: progress?.percent || 0,
        resumeEpisodeId: lastEpisodeId || null,
      });
    })
    .filter(Boolean)
    .sort((a, b) => (progressMap[b.id]?.updatedAt || 0) - (progressMap[a.id]?.updatedAt || 0));

  const lastRead = getLastInteraction(events, ["read_episode", "view_series"]);
  const seedSeries = safeCatalog.find((item) => item.id === lastRead?.seriesId);
  const becauseYouReadRail = seedSeries
    ? safeCatalog
        .filter((item) => item.id !== seedSeries.id)
        .map((item) => ({
          item,
          score: scoreSeries(seedSeries.genres || [], item),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ item }) =>
          mapSeriesCard(item, item.genres?.[0] || "Similar vibe", "For you"),
        )
    : [];

  const trendingRail = [...safeCatalog]
    .sort((a, b) => getEditorialScore(b) - getEditorialScore(a))
    .slice(0, 10)
    .map((series) =>
      mapSeriesCard(series, isRecentlyUpdated(series, 14) ? "Recently updated" : "Worth a look"),
    );

  const newRail = [...safeCatalog]
    .sort((a, b) => parseLatestNumber(b.latest) - parseLatestNumber(a.latest))
    .slice(0, 10)
    .map((series) => mapSeriesCard(series, "Latest episode listed", "Updated"));

  const completedRail = safeCatalog
    .filter((series) => normalizeStatus(series.status) === "completed")
    .sort((a, b) => getEditorialScore(b) - getEditorialScore(a))
    .map((series) => mapSeriesCard(series, "Finished run", "Completed"));

  const ttfRail = safeCatalog
    .filter((series) => getEpisodeCount(series) > 0 && getEpisodeCount(series) <= 24)
    .sort((a, b) => getEpisodeCount(a) - getEpisodeCount(b) || getEditorialScore(b) - getEditorialScore(a))
    .map((series) => mapSeriesCard(series, "Start here", "Start here"));

  const adultRail = isAdultMode
    ? safeCatalog
        .sort((a, b) => getEditorialScore(b) - getEditorialScore(a))
        .map((series) => mapSeriesCard(series, "18+ read", "18+"))
    : [];

  return {
    continueRail,
    becauseYouReadRail,
    becauseYouReadTitle: seedSeries ? `Because you read ${seedSeries.title}` : "",
    trendingRail,
    newRail,
    completedRail,
    ttfRail,
    adultRail,
  };
}
