import { isAdultContent } from "./contentFilters";

const DAY_MS = 24 * 60 * 60 * 1000;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getEpisodeCount(series) {
  return Math.max(0, toNumber(series?.episodeCount));
}

function getUpdatedAtMs(series) {
  const parsed = Date.parse(series?.updatedAt || series?.createdAt || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isCompletedSeries(series) {
  return normalizeStatus(series?.status) === "completed";
}

function isRecentlyUpdated(series, days = 21) {
  const updatedAtMs = getUpdatedAtMs(series);
  if (!updatedAtMs) {
    return false;
  }

  return updatedAtMs >= Date.now() - days * DAY_MS;
}

function getBacklogAccessibilityBonus(series) {
  const episodeCount = getEpisodeCount(series);
  if (episodeCount <= 0) {
    return 0;
  }
  if (episodeCount <= 12) {
    return 18 * DAY_MS;
  }
  if (episodeCount <= 24) {
    return 12 * DAY_MS;
  }
  if (episodeCount <= 48) {
    return 6 * DAY_MS;
  }
  return 0;
}

function getCatalogSignalLabel(series) {
  if (isCompletedSeries(series)) {
    return "Completed";
  }
  if (isRecentlyUpdated(series, 14)) {
    return "Updated";
  }
  if (getEpisodeCount(series) > 0 && getEpisodeCount(series) <= 12) {
    return "Top picks";
  }
  return "";
}

function getBadgeTokens(series) {
  const tokens = [];

  if (isCompletedSeries(series)) {
    tokens.push("COMPLETED");
  }
  if (isRecentlyUpdated(series, 14)) {
    tokens.push("UPDATED");
  }
  if (getEpisodeCount(series) > 0 && getEpisodeCount(series) <= 12) {
    tokens.push("START");
  }

  return tokens;
}

function getVisibleCatalog(seriesList) {
  return (Array.isArray(seriesList) ? seriesList : []).filter(
    (series) =>
      series && typeof series === "object" && series.isPublished !== false,
  );
}

function normalizeSlotToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
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
        ? slot.seriesIds
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        : [],
    );
  });
  return slotMap;
}

function resolveHomepageSlotSeries(
  seriesPool,
  homepageSlots,
  slotId,
  limit = Infinity,
) {
  const slotIds =
    buildHomepageSlotMap(homepageSlots).get(normalizeSlotToken(slotId)) || [];
  if (slotIds.length === 0) {
    return [];
  }
  const seriesById = buildSeriesById(seriesPool);
  return slotIds
    .map((seriesId) => seriesById.get(seriesId))
    .filter(Boolean)
    .slice(0, limit);
}

function getEditorialSeriesScore(series) {
  return (
    getUpdatedAtMs(series) +
    getBacklogAccessibilityBonus(series) +
    (isCompletedSeries(series) ? 14 * DAY_MS : 0) +
    (series?.coverUrl ? 3 * DAY_MS : 0) +
    (String(series?.description || "").trim() ? 2 * DAY_MS : 0)
  );
}

function getStartHereScore(series) {
  return (
    getEditorialSeriesScore(series) +
    getBacklogAccessibilityBonus(series) +
    (getEpisodeCount(series) > 0 ? 3 * DAY_MS : 0)
  );
}

function getBreakoutScore(series) {
  return (
    getEditorialSeriesScore(series) +
    (isRecentlyUpdated(series, 14) ? 10 * DAY_MS : 0) +
    (getEpisodeCount(series) > 0 && getEpisodeCount(series) <= 24
      ? 4 * DAY_MS
      : 0)
  );
}

function mapHeroSeries(series, index, bannerUrl = null) {
  return {
    id: `hero-${series.id || index + 1}`,
    seriesId: series.id,
    latestEpisodeId: series.latestEpisodeId || null,
    title: series.title,
    description:
      series.description ||
      `${Array.isArray(series.genres) ? series.genres.join(" | ") : ""}`,
    coverTone: series.coverTone || "default",
    coverUrl: series.coverUrl,
    bannerUrl: bannerUrl || series.bannerUrl || null,
    badge: getCatalogSignalLabel(series),
    status: series.status,
    episodeCount: getEpisodeCount(series),
    freeEpisodeCount: 0,
    hasFreeEpisodes: false,
  };
}

export function getSeriesScore(series) {
  return Math.round(getEditorialSeriesScore(series) / DAY_MS);
}

export function getReaderProof(series) {
  return (
    getEpisodeCount(series) +
    (Array.isArray(series?.genres) ? series.genres.length : 0) +
    (Array.isArray(series?.creatorCredits) ? series.creatorCredits.length : 0) +
    (series?.coverUrl ? 2 : 0) +
    (String(series?.description || "").trim() ? 2 : 0) +
    (isCompletedSeries(series) ? 4 : 0)
  );
}

function getLibraryReturnScore(series) {
  return (
    getEditorialSeriesScore(series) +
    getEpisodeCount(series) * DAY_MS +
    (isRecentlyUpdated(series, 30) ? 5 * DAY_MS : 0)
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
    sourceLabel: "Recent standout",
    entryPoint: "LIBRARY_BREAKOUT_FILL",
    campaignId: "library_breakout_fill",
    limit: 2,
  },
  {
    slotId: "home-binge-ready",
    sourceLabel: "Binge-ready pick",
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
    resolveHomepageSlotSeries(
      visibleCatalog,
      options.homepageSlots,
      source.slotId,
      source.limit,
    ).map((series) => ({
      series,
      sourceSlot: source.slotId,
      sourceLabel: source.sourceLabel,
      entryPoint: source.entryPoint,
      campaignId: source.campaignId,
    })),
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
    .sort(
      (left, right) =>
        getLibraryReturnScore(right) - getLibraryReturnScore(left),
    )
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
    ...[...visibleCatalog].sort(
      (left, right) =>
        getEditorialSeriesScore(right) - getEditorialSeriesScore(left),
    ),
  ])
    .slice(0, 6)
    .map((series, index) =>
      mapHeroSeries(series, index, index === 0 ? bannerUrl : null),
    );

  if (featured.length > 0) {
    if (bannerUrl && featured[0]) {
      featured[0] = { ...featured[0], bannerUrl };
    }
    return featured;
  }

  return visibleCatalog
    .slice(0, 4)
    .map((series, index) => mapHeroSeries(series, index));
}

export function getHomeEditorialSnapshot(seriesList, options = {}) {
  const visibleCatalog = getVisibleCatalog(seriesList);
  const safeCatalog = visibleCatalog.filter((series) => !isAdultContent(series));
  const genres = new Set();
  let newCount = 0;
  let adultCount = 0;

  visibleCatalog.forEach((series) => {
    if (isAdultContent(series)) {
      adultCount += 1;
    }

    if (isRecentlyUpdated(series, 30)) {
      newCount += 1;
    }

    if (Array.isArray(series?.genres)) {
      series.genres.forEach((genre) => genres.add(genre));
    }
  });

  const completedSeries = safeCatalog.filter((series) =>
    isCompletedSeries(series),
  );
  const startHereSeries = [...safeCatalog]
    .filter((series) => getEpisodeCount(series) > 0)
    .sort((left, right) => getStartHereScore(right) - getStartHereScore(left));
  const breakoutSeries = [...safeCatalog].sort(
    (left, right) => getBreakoutScore(right) - getBreakoutScore(left),
  );

  const completedPick =
    [...completedSeries].sort(
      (left, right) =>
        getEditorialSeriesScore(right) - getEditorialSeriesScore(left),
    )[0] || null;
  const freeStartPick = startHereSeries[0] || null;
  const breakoutPick = breakoutSeries[0] || null;
  const slotDrivenFreeStartPick =
    resolveHomepageSlotSeries(
      safeCatalog,
      options.homepageSlots,
      "home-free-start",
      1,
    )[0] || null;
  const slotDrivenCompletedPick =
    resolveHomepageSlotSeries(
      safeCatalog,
      options.homepageSlots,
      "home-binge-ready",
      1,
    )[0] || null;
  const slotDrivenBreakoutPick =
    resolveHomepageSlotSeries(
      safeCatalog,
      options.homepageSlots,
      "home-breakout",
      1,
    )[0] || null;

  return {
    visibleCatalog,
    safeCatalog,
    startHereSeries,
    seriesCount: visibleCatalog.length,
    genreCount: genres.size,
    newCount,
    adultCount,
    completedSeriesCount: completedSeries.length,
    freeStartSeriesCount: startHereSeries.length,
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
      { label: "Fresh drops", value: "--", hint: "Recently updated titles" },
      {
        label: "Genres",
        value: "--",
        hint: "Browse without losing your place",
      },
      { label: "18+ catalog", value: "--", hint: "Protected behind sign-in" },
    ];
  }

  const snapshot = getHomeEditorialSnapshot(seriesList);
  return [
    {
      label: "Series live",
      value: snapshot.seriesCount.toLocaleString(),
      hint: "Across comics and novels",
    },
    {
      label: "Fresh drops",
      value: snapshot.newCount.toLocaleString(),
      hint: "Recently updated titles",
    },
    {
      label: "Genres",
      value: snapshot.genreCount.toLocaleString(),
      hint: "Browse without losing your place",
    },
    {
      label: "18+ catalog",
      value: snapshot.adultCount.toLocaleString(),
      hint: "Protected behind sign-in",
    },
  ];
}

export function getHomeHeroCandidates(seriesList, options = {}) {
  const limit = Math.max(1, Number(options.limit || 8));
  const visibleCatalog = getVisibleCatalog(seriesList).filter(
    (series) => !isAdultContent(series),
  );

  return visibleCatalog
    .filter((series) => series?.id && series?.title)
    .map((series) => {
      const reasons = [];
      const episodeCount = getEpisodeCount(series);

      if (isCompletedSeries(series)) {
        reasons.push("已完结");
      }
      if (isRecentlyUpdated(series, 14)) {
        reasons.push("近期更新");
      }
      if (episodeCount > 0 && episodeCount <= 24) {
        reasons.push("适合从这里开始");
      }
      if (
        Array.isArray(series?.creatorCredits) &&
        series.creatorCredits.length > 0
      ) {
        reasons.push("署名已齐");
      }

      return {
        series,
        score: getEditorialSeriesScore(series),
        reasons: reasons.slice(0, 4),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
