function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBadgeTokens(series) {
  return [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])]
    .filter(Boolean)
    .map((badge) => String(badge).trim().toUpperCase())
    .filter(Boolean);
}

function getVisibleCatalog(seriesList) {
  return (Array.isArray(seriesList) ? seriesList : []).filter(
    (series) => series && typeof series === "object" && series.isPublished !== false,
  );
}

function mapHeroSeries(series, index, bannerUrl = null) {
  return {
    id: `hero-${series.id || index + 1}`,
    seriesId: series.id,
    latestEpisodeId: series.latestEpisodeId || null,
    title: series.title,
    description: series.description || `${Array.isArray(series.genres) ? series.genres.join(" | ") : ""}`,
    coverTone: series.coverTone || "default",
    coverUrl: series.coverUrl,
    bannerUrl: bannerUrl || series.bannerUrl || null,
    badge: series.badge,
    status: series.status,
    freeEpisodeCount: toNumber(series.freeEpisodeCount),
    hasFreeEpisodes: Boolean(series.hasFreeEpisodes || toNumber(series.freeEpisodeCount) > 0),
  };
}

export function getSeriesScore(series) {
  return toNumber(series?.rating) * Math.max(1, toNumber(series?.ratingCount) || 1);
}

export function getReaderProof(series) {
  return Math.max(
    toNumber(series?.followers),
    toNumber(series?.views),
    toNumber(series?.ratingCount),
    Math.round(toNumber(series?.rating) * 100),
  );
}

export function buildHomeHeroItems(seriesList, options = {}) {
  const visibleCatalog = getVisibleCatalog(seriesList);
  if (visibleCatalog.length === 0) {
    return [];
  }

  const bannerUrl = String(options.bannerUrl || "").trim() || null;
  const featured = visibleCatalog
    .filter((series) => {
      const badges = getBadgeTokens(series);
      return badges.includes("HOT") || toNumber(series?.rating) >= 4.5;
    })
    .sort((left, right) => toNumber(right?.rating) - toNumber(left?.rating))
    .slice(0, 6)
    .map((series, index) => mapHeroSeries(series, index, index === 0 ? bannerUrl : null));

  if (featured.length > 0) {
    if (bannerUrl && featured[0]) {
      featured[0] = { ...featured[0], bannerUrl };
    }
    return featured;
  }

  return visibleCatalog.slice(0, 4).map((series, index) => mapHeroSeries(series, index));
}

export function getHomeEditorialSnapshot(seriesList) {
  const visibleCatalog = getVisibleCatalog(seriesList);
  const safeCatalog = visibleCatalog.filter((series) => !series?.adult);
  const genres = new Set();
  let newCount = 0;
  let adultCount = 0;

  visibleCatalog.forEach((series) => {
    if (series?.adult) {
      adultCount += 1;
    }

    if (getBadgeTokens(series).includes("NEW")) {
      newCount += 1;
    }

    if (Array.isArray(series?.genres)) {
      series.genres.forEach((genre) => genres.add(genre));
    }
  });

  const completedSeries = safeCatalog.filter(
    (series) => String(series?.status || "").toLowerCase() === "completed",
  );
  const freeStartSeries = safeCatalog.filter(
    (series) => toNumber(series?.freeEpisodeCount) > 0 || series?.hasFreeEpisodes,
  );
  const breakoutSeries = safeCatalog.filter((series) => {
    const badges = getBadgeTokens(series);
    return badges.includes("NEW") || badges.includes("HOT");
  });

  const completedPick = [...completedSeries].sort(
    (left, right) => getSeriesScore(right) - getSeriesScore(left),
  )[0] || null;
  const freeStartPick = [...freeStartSeries].sort((left, right) => {
    const freeDelta = toNumber(right?.freeEpisodeCount) - toNumber(left?.freeEpisodeCount);
    if (freeDelta !== 0) {
      return freeDelta;
    }
    return getSeriesScore(right) - getSeriesScore(left);
  })[0] || null;
  const breakoutPick = [...breakoutSeries].sort(
    (left, right) => getSeriesScore(right) - getSeriesScore(left),
  )[0] || null;

  return {
    visibleCatalog,
    safeCatalog,
    seriesCount: visibleCatalog.length,
    genreCount: genres.size,
    newCount,
    adultCount,
    completedSeriesCount: completedSeries.length,
    freeStartSeriesCount: freeStartSeries.length,
    breakoutSeriesCount: breakoutSeries.length,
    completedPick,
    freeStartPick,
    breakoutPick,
  };
}

export function getHomeEditorialStats(seriesList, options = {}) {
  if (options.loading) {
    return [
      { label: "Series live", value: "--", hint: "Across comics and novels" },
      { label: "Fresh drops", value: "--", hint: "Recently tagged new" },
      { label: "Genre lanes", value: "--", hint: "Filter without dead ends" },
      { label: "18+ catalog", value: "--", hint: "Protected behind sign-in" },
    ];
  }

  const snapshot = getHomeEditorialSnapshot(seriesList);
  return [
    { label: "Series live", value: snapshot.seriesCount.toLocaleString(), hint: "Across comics and novels" },
    { label: "Fresh drops", value: snapshot.newCount.toLocaleString(), hint: "Recently tagged new" },
    { label: "Genre lanes", value: snapshot.genreCount.toLocaleString(), hint: "Filter without dead ends" },
    { label: "18+ catalog", value: snapshot.adultCount.toLocaleString(), hint: "Protected behind sign-in" },
  ];
}

export function getHomeHeroCandidates(seriesList, options = {}) {
  const limit = Math.max(1, Number(options.limit || 8));
  const visibleCatalog = getVisibleCatalog(seriesList).filter((series) => !series?.adult);

  return visibleCatalog
    .filter((series) => series?.id && series?.title)
    .map((series) => {
      const badges = getBadgeTokens(series);
      const readinessSignals = [];

      if (badges.includes("HOT")) {
        readinessSignals.push("HOT 标记");
      }
      if (badges.includes("NEW")) {
        readinessSignals.push("NEW 标记");
      }
      if (toNumber(series?.freeEpisodeCount) > 0 || series?.hasFreeEpisodes) {
        readinessSignals.push("可做免费开篇");
      }
      if (toNumber(series?.rating) >= 4.5) {
        readinessSignals.push("高评分");
      }
      if (String(series?.status || "").toLowerCase() === "completed") {
        readinessSignals.push("适合 binge");
      }
      if (getReaderProof(series) >= 1000) {
        readinessSignals.push("读者信号强");
      }

      const score =
        getSeriesScore(series) +
        getReaderProof(series) / 100 +
        toNumber(series?.episodeCount) * 2 +
        (badges.includes("HOT") ? 180 : 0) +
        (badges.includes("NEW") ? 120 : 0) +
        (toNumber(series?.freeEpisodeCount) > 0 || series?.hasFreeEpisodes ? 100 : 0) +
        (String(series?.status || "").toLowerCase() === "completed" ? 60 : 0) +
        (series?.coverUrl ? 40 : 0) +
        (String(series?.description || "").trim() ? 30 : 0);

      return {
        series,
        score,
        reasons: readinessSignals.slice(0, 4),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
