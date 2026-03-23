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

function mapSeriesCard(series, subtitle, badgeOverride, extra = {}) {
  return {
    id: series.id,
    seriesId: series.id,
    title: series.title,
    author: series.author || "",
    subtitle: subtitle || series.status || "Series",
    type: series.type || "",
    seriesType: series.type || "",
    status: series.status || "",
    genres: Array.isArray(series.genres) ? series.genres : [],
    coverTone: series.coverTone,
    coverUrl: series.coverUrl,
    badge: badgeOverride || series.badge,
    adult: Boolean(series.adult),
    freeEpisodeCount: Number(series.freeEpisodeCount || 0),
    hasFreeEpisodes: Boolean(series.hasFreeEpisodes || Number(series.freeEpisodeCount || 0) > 0),
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
  const rating = series.rating || 0;
  return overlap * 3 + rating;
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
        .map(({ item }) => mapSeriesCard(item, item.genres?.[0] || "Similar vibe", "For you"))
    : [];

  const trendingRail = [...safeCatalog]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10)
    .map((series) => mapSeriesCard(series, "Readers are opening this"));

  const newRail = [...safeCatalog]
    .sort((a, b) => parseLatestNumber(b.latest) - parseLatestNumber(a.latest))
    .slice(0, 10)
    .map((series) => mapSeriesCard(series, "Just landed"));

  const completedRail = safeCatalog
    .filter((series) => series.status === "Completed")
    .map((series) => mapSeriesCard(series, "Finished run"));

  const ttfRail = safeCatalog
    .filter((series) => series.ttf?.enabled)
    .map((series) => mapSeriesCard(series, "Free start", "FREE"));

  const adultRail = isAdultMode
    ? safeCatalog.map((series) => mapSeriesCard(series, "18+ read", "18+"))
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
