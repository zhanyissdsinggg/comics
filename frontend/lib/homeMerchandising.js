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

function normalizeSlotToken(value) {
  return String(value || "").trim().toLowerCase();
}

function dedupeSeries(seriesList) {
  const seen = new Set();
  return (Array.isArray(seriesList) ? seriesList : []).filter((series) => {
    const seriesId = String(series?.id || "").trim();
    if (!seriesId || seen.has(seriesId)) {
      return false;
    }
    seen.add(seriesId);
    return true;
  });
}

function buildSeriesById(seriesList) {
  return new Map(
    (Array.isArray(seriesList) ? seriesList : [])
      .map((series) => [String(series?.id || "").trim(), series])
      .filter(([seriesId, series]) => Boolean(seriesId) && Boolean(series)),
  );
}

function buildHomepageSlotMap(homepageSlots) {
  const slotMap = new Map();
  (Array.isArray(homepageSlots) ? homepageSlots : []).forEach((slot) => {
    const slotId = normalizeSlotToken(slot?.slot || slot?.name || slot?.id);
    if (!slotId) {
      return;
    }
    slotMap.set(
      slotId,
      Array.isArray(slot?.seriesIds)
        ? slot.seriesIds.map((item) => String(item || "").trim()).filter(Boolean)
        : [],
    );
  });
  return slotMap;
}

function resolveHomepageSlotSeries(seriesPool, homepageSlots, slotId, limit = Infinity) {
  const slotIds = buildHomepageSlotMap(homepageSlots).get(normalizeSlotToken(slotId)) || [];
  if (slotIds.length === 0) {
    return [];
  }
  const seriesById = buildSeriesById(seriesPool);
  return slotIds.map((seriesId) => seriesById.get(seriesId)).filter(Boolean).slice(0, limit);
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

function getLibraryReturnScore(series) {
  const badges = getBadgeTokens(series);
  return (
    getSeriesScore(series) +
    getReaderProof(series) +
    toNumber(series?.episodeCount) * 3 +
    toNumber(series?.freeEpisodeCount) * 18 +
    (String(series?.status || "").toLowerCase() === "completed" ? 140 : 0) +
    (badges.includes("HOT") ? 120 : 0) +
    (badges.includes("NEW") ? 60 : 0) +
    (series?.coverUrl ? 30 : 0)
  );
}

const LIBRARY_RETURN_SLOT_PRIORITIES = [
  {
    slotId: "library-return",
    sourceLabel: "Staff pick to resume",
    entryPoint: "LIBRARY_RETURN_SLOT",
    campaignId: "library_return_slot",
    limit: 8,
  },
  {
    slotId: "home-breakout",
    sourceLabel: "Trending breakout pick",
    entryPoint: "LIBRARY_BREAKOUT_FILL",
    campaignId: "library_breakout_fill",
    limit: 2,
  },
  {
    slotId: "home-binge-ready",
    sourceLabel: "Binge-ready fallback",
    entryPoint: "LIBRARY_BINGE_FILL",
    campaignId: "library_binge_fill",
    limit: 2,
  },
  {
    slotId: "home-free-start",
    sourceLabel: "Easy-entry pick",
    entryPoint: "LIBRARY_FREE_START_FILL",
    campaignId: "library_free_start_fill",
    limit: 2,
  },
  {
    slotId: "home-hero",
    sourceLabel: "Front-page spotlight",
    entryPoint: "LIBRARY_HERO_FILL",
    campaignId: "library_hero_fill",
    limit: 4,
  },
];

export function getLibraryReturnCandidates(seriesList, options = {}) {
  const limit = Math.max(1, Number(options.limit || 8));
  const visibleCatalog = getVisibleCatalog(seriesList);
  const excludedIds = new Set(
    (Array.isArray(options.excludeSeriesIds) ? options.excludeSeriesIds : [])
      .map((seriesId) => String(seriesId || "").trim())
      .filter(Boolean),
  );
  const includeLibraryReturnSlot = options.includeLibraryReturnSlot !== false;
  const seenIds = new Set();

  const slotCandidates = LIBRARY_RETURN_SLOT_PRIORITIES.filter(
    (source) => includeLibraryReturnSlot || source.slotId !== "library-return",
  ).flatMap((source) =>
    resolveHomepageSlotSeries(visibleCatalog, options.homepageSlots, source.slotId, source.limit).map(
      (series) => ({
        series,
        sourceSlot: source.slotId,
        sourceLabel: source.sourceLabel,
        entryPoint: source.entryPoint,
        campaignId: source.campaignId,
      }),
    ),
  );

  const prioritizedEntries = slotCandidates.filter((entry) => {
    const seriesId = String(entry?.series?.id || "").trim();
    if (!seriesId || excludedIds.has(seriesId) || seenIds.has(seriesId)) {
      return false;
    }
    seenIds.add(seriesId);
    return true;
  });

  const fallbackEntries = [...visibleCatalog]
    .sort((left, right) => getLibraryReturnScore(right) - getLibraryReturnScore(left))
    .filter((series) => {
      const seriesId = String(series?.id || "").trim();
      if (!seriesId || excludedIds.has(seriesId) || seenIds.has(seriesId)) {
        return false;
      }
      seenIds.add(seriesId);
      return true;
    })
    .map((series) => ({
      series,
      sourceSlot: null,
      sourceLabel: null,
      entryPoint: "LIBRARY_RECOMMENDED_RAIL",
      campaignId: "recommended_rail",
    }));

  return [...prioritizedEntries, ...fallbackEntries].slice(0, limit);
}

export function buildHomeHeroItems(seriesList, options = {}) {
  const visibleCatalog = getVisibleCatalog(seriesList);
  if (visibleCatalog.length === 0) {
    return [];
  }

  const bannerUrl = String(options.bannerUrl || "").trim() || null;
  const slotDrivenHeroSeries = resolveHomepageSlotSeries(
    visibleCatalog,
    options.homepageSlots,
    "home-hero",
    6,
  );
  const featured = dedupeSeries([
    ...slotDrivenHeroSeries,
    ...visibleCatalog
      .filter((series) => {
        const badges = getBadgeTokens(series);
        return badges.includes("HOT") || toNumber(series?.rating) >= 4.5;
      })
      .sort((left, right) => toNumber(right?.rating) - toNumber(left?.rating)),
  ])
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

export function getHomeEditorialSnapshot(seriesList, options = {}) {
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
  const slotDrivenFreeStartPick =
    resolveHomepageSlotSeries(safeCatalog, options.homepageSlots, "home-free-start", 1)[0] || null;
  const slotDrivenCompletedPick =
    resolveHomepageSlotSeries(safeCatalog, options.homepageSlots, "home-binge-ready", 1)[0] || null;
  const slotDrivenBreakoutPick =
    resolveHomepageSlotSeries(safeCatalog, options.homepageSlots, "home-breakout", 1)[0] || null;

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
    completedPick: slotDrivenCompletedPick || completedPick,
    freeStartPick: slotDrivenFreeStartPick || freeStartPick,
    breakoutPick: slotDrivenBreakoutPick || breakoutPick,
  };
}

export function getHomeEditorialStats(seriesList, options = {}) {
  if (options.loading) {
    return [
      { label: "Series live", value: "--", hint: "Across comics and novels" },
      { label: "Fresh drops", value: "--", hint: "Recently tagged new" },
      { label: "Genres", value: "--", hint: "Browse without losing your place" },
      { label: "18+ catalog", value: "--", hint: "Protected behind sign-in" },
    ];
  }

  const snapshot = getHomeEditorialSnapshot(seriesList);
  return [
    { label: "Series live", value: snapshot.seriesCount.toLocaleString(), hint: "Across comics and novels" },
    { label: "Fresh drops", value: snapshot.newCount.toLocaleString(), hint: "Recently tagged new" },
    { label: "Genres", value: snapshot.genreCount.toLocaleString(), hint: "Browse without losing your place" },
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
