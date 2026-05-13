"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  ChevronRight,
  Filter,
  Gamepad2,
  History,
  PlayCircle,
  Sparkles,
  Star,
  Swords,
  Trophy,
} from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import { getContentModeQueryParam } from "../../lib/contentFilters";
import { resolveDisplayImageUrl } from "../../lib/fallbackImage";
import { trackEvent } from "../../lib/trackEvent";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import FigmaChrome from "./FigmaChrome";
import {
  FIGMA_CONTENT_TYPES,
  buildDisplayItems,
  buildFigmaCatalog,
  buildGenreOptions,
  cn,
  filterContentByMode,
  inferCatalogHero,
  sortByRating,
  sortByUpdated,
  filterByGenre,
} from "./figma-utils";

const SORTS = ["Trending", "Newest", "Highest Rated", "Most Views"];
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const FIGMA_CATALOG_SOURCES = {
  SERIES: "series",
  RANKINGS: "rankings",
};

function normalizeCatalogSource(value) {
  return value === FIGMA_CATALOG_SOURCES.RANKINGS
    ? FIGMA_CATALOG_SOURCES.RANKINGS
    : FIGMA_CATALOG_SOURCES.SERIES;
}

function getActionIcon(contentType) {
  if (contentType === FIGMA_CONTENT_TYPES.INTERACTIVE) {
    return Gamepad2;
  }
  if (contentType === FIGMA_CONTENT_TYPES.NOVELS) {
    return PlayCircle;
  }
  return PlayCircle;
}

function getReadLabel(contentType) {
  if (contentType === FIGMA_CONTENT_TYPES.INTERACTIVE) {
    return "Start Playing";
  }
  return "Start Reading";
}

function getContinueLabel(contentType) {
  if (contentType === FIGMA_CONTENT_TYPES.INTERACTIVE) {
    return "Resume Playthrough";
  }
  return "Jump Back In";
}

function getUpdateLabel(contentType) {
  if (contentType === FIGMA_CONTENT_TYPES.INTERACTIVE) {
    return "New Story Paths";
  }
  if (contentType === FIGMA_CONTENT_TYPES.NOVELS) {
    return "Latest Chapters";
  }
  return "Daily Updates";
}

function getRankingLabel(contentType) {
  if (contentType === FIGMA_CONTENT_TYPES.INTERACTIVE) {
    return "Top Rated Stories";
  }
  if (contentType === FIGMA_CONTENT_TYPES.NOVELS) {
    return "Top Rated Novels";
  }
  return "Top Rated Picks";
}

function getRankingMetaLabel(contentType) {
  if (contentType === FIGMA_CONTENT_TYPES.INTERACTIVE) {
    return "Ranked by story rating";
  }
  if (contentType === FIGMA_CONTENT_TYPES.NOVELS) {
    return "Ranked by reader rating";
  }
  return "Ranked by reader rating";
}

function getRankingItemNote(item) {
  if (item?.status === "END") {
    return "Completed series";
  }
  if (item?.latestInstallmentLabel) {
    return `Latest ${item.latestInstallmentLabel}`;
  }
  return "Ready to read";
}

function getDailyUpdateNote(item) {
  if (item?.status === "END") {
    return "Completed";
  }
  if (item?.status === "UP") {
    return item.latestInstallmentLabel
      ? `Updated with ${item.latestInstallmentLabel}`
      : "Updated recently";
  }
  if (item?.latestInstallmentLabel) {
    return `Latest ${item.latestInstallmentLabel}`;
  }
  return "Start now";
}

function HomeContent({
  seriesList = [],
  initialReady = false,
  catalogSource = FIGMA_CATALOG_SOURCES.SERIES,
}) {
  const { palette, contentMode, contentType } = useFigmaSite();
  const [activeDay, setActiveDay] = useState("WED");
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeSort, setActiveSort] = useState("Trending");
  const normalizedCatalogSource = useMemo(
    () => normalizeCatalogSource(catalogSource),
    [catalogSource],
  );
  const [catalogSeed, setCatalogSeed] = useState(() =>
    Array.isArray(seriesList) ? seriesList : [],
  );
  const [catalogLoading, setCatalogLoading] = useState(!initialReady);
  const requestRef = useRef(0);
  const initialRequestHandledRef = useRef(false);
  const homeViewTrackedRef = useRef(false);
  const impressionKeysRef = useRef(new Set());
  const initialRequestKey = useMemo(
    () =>
      JSON.stringify({
        source: normalizedCatalogSource,
        adult: getContentModeQueryParam(contentMode),
      }),
    [contentMode, normalizedCatalogSource],
  );

  useEffect(() => {
    setCatalogSeed(Array.isArray(seriesList) ? seriesList : []);
  }, [seriesList]);

  useEffect(() => {
    let active = true;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const adultFlag = getContentModeQueryParam(contentMode);
    const requestKey = JSON.stringify({
      source: normalizedCatalogSource,
      adult: adultFlag,
    });
    const reuseInitialPayload =
      !initialRequestHandledRef.current &&
      initialReady &&
      requestKey === initialRequestKey;

    initialRequestHandledRef.current = true;

    if (reuseInitialPayload) {
      setCatalogLoading(false);
      return () => {
        active = false;
      };
    }

    setCatalogLoading(true);

    const endpoint =
      normalizedCatalogSource === FIGMA_CATALOG_SOURCES.RANKINGS
        ? `/api/rankings?type=popular&window=all&adult=${adultFlag}`
        : `/api/series?adult=${adultFlag}`;

    apiGet(endpoint, { cacheMs: 30_000 })
      .then((response) => {
        if (!active || requestRef.current !== requestId) {
          return;
        }

        if (!response.ok) {
          setCatalogSeed([]);
          setCatalogLoading(false);
          return;
        }

        const nextItems =
          normalizedCatalogSource === FIGMA_CATALOG_SOURCES.RANKINGS
            ? response.data?.rankings
            : response.data?.series;

        setCatalogSeed(Array.isArray(nextItems) ? nextItems : []);
        setCatalogLoading(false);
      })
      .catch(() => {
        if (!active || requestRef.current !== requestId) {
          return;
        }
        setCatalogSeed([]);
        setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contentMode, initialReady, initialRequestKey, normalizedCatalogSource]);

  const catalog = useMemo(() => buildFigmaCatalog(catalogSeed), [catalogSeed]);
  const currentItems = useMemo(
    () => buildDisplayItems(contentType, catalog, contentMode),
    [catalog, contentMode, contentType],
  );

  const filteredByGenre = useMemo(
    () => filterByGenre(currentItems, activeGenre),
    [currentItems, activeGenre],
  );

  const sortedItems = useMemo(() => {
    if (activeSort === "Newest") {
      return sortByUpdated(filteredByGenre);
    }
    if (activeSort === "Highest Rated") {
      return sortByRating(filteredByGenre);
    }
    if (activeSort === "Most Views") {
      return [...filteredByGenre].sort(
        (left, right) =>
          Number(right?.viewsValue || 0) - Number(left?.viewsValue || 0),
      );
    }
    return sortByRating(filteredByGenre);
  }, [activeSort, filteredByGenre]);

  const modeScopedItems = filterContentByMode(currentItems, contentMode);
  const heroItem =
    inferCatalogHero(sortedItems) || inferCatalogHero(modeScopedItems);
  const gridItems = [...sortedItems, ...sortedItems].slice(0, 6);
  const exploreGridItems = [
    ...sortedItems,
    ...sortedItems,
    ...sortedItems,
  ].slice(0, 12);
  const rankItems = sortByRating(sortedItems).slice(0, 5);
  const genreOptions = buildGenreOptions(currentItems);
  const continueItems = sortedItems.slice(0, 2);
  const continueSectionHasProgress = continueItems.some(
    (item) => item.hasProgress,
  );

  const ActionIcon = getActionIcon(contentType);
  const continueLabel = getContinueLabel(contentType);
  const updatesLabel = getUpdateLabel(contentType);
  const rankingLabel = getRankingLabel(contentType);
  const rankingMetaLabel = getRankingMetaLabel(contentType);
  const continueSectionTitle = continueSectionHasProgress
    ? continueLabel
    : getReadLabel(contentType);

  useEffect(() => {
    if (normalizedCatalogSource !== FIGMA_CATALOG_SOURCES.SERIES) {
      return;
    }
    if (homeViewTrackedRef.current) {
      return;
    }

    homeViewTrackedRef.current = true;
    trackEvent("home_view", {
      contentMode,
      contentType,
      sourceSection: "home_page",
    });
  }, [contentMode, contentType, normalizedCatalogSource]);

  useEffect(() => {
    if (catalogLoading) {
      return;
    }

    [
      heroItem
        ? { item: heroItem, sourceSection: "home_hero", position: 1 }
        : null,
      ...continueItems.map((item, index) => ({
        item,
        sourceSection: "continue_reading",
        position: index + 1,
      })),
      ...rankItems.map((item, index) => ({
        item,
        sourceSection: "top_rated_picks",
        position: index + 1,
      })),
    ]
      .filter(Boolean)
      .forEach(({ item, sourceSection, position }) => {
        const impressionKey = `${normalizedCatalogSource}:${contentMode}:${sourceSection}:${item.id}`;
        if (impressionKeysRef.current.has(impressionKey)) {
          return;
        }

        impressionKeysRef.current.add(impressionKey);
        trackEvent("story_impression", {
          seriesId: item.id,
          contentMode,
          contentType: item.kind,
          isAdult: item.isAdult,
          sourceSection,
          position,
        });
      });
  }, [
    catalogLoading,
    contentMode,
    continueItems,
    heroItem,
    normalizedCatalogSource,
    rankItems,
  ]);

  const handleGenreSelect = (nextGenre) => {
    trackEvent("genre_filter_click", {
      contentMode,
      contentType,
      genre: nextGenre,
      sourceSection:
        normalizedCatalogSource === FIGMA_CATALOG_SOURCES.RANKINGS
          ? "rankings_filters"
          : "home_filters",
    });
    setActiveGenre(nextGenre);
  };

  const handleSortSelect = (nextSort) => {
    if (normalizedCatalogSource === FIGMA_CATALOG_SOURCES.RANKINGS) {
      trackEvent("ranking_filter_click", {
        contentMode,
        contentType,
        view: nextSort,
        sourceSection: "rankings_filters",
      });
    }
    setActiveSort(nextSort);
  };

  const handleStoryClick = (item, sourceSection, position = 1) => {
    trackEvent("story_click", {
      seriesId: item?.id,
      contentMode,
      contentType: item?.kind || contentType,
      isAdult: item?.isAdult,
      sourceSection,
      position,
    });
  };

  if (!heroItem) {
    return (
      <div className={cn("min-h-screen", palette.rootBg)}>
        <FigmaChrome>
          <main className="mx-auto flex min-h-[70vh] max-w-[960px] items-center justify-center px-4 py-24">
            <div
              className={cn(
                "w-full rounded-3xl border p-10 text-center shadow-2xl",
                palette.surface,
                palette.border,
              )}
            >
              <h1 className="mb-3 text-3xl font-black tracking-tight text-white">
                {catalogLoading ? "Loading titles" : "No titles live yet"}
              </h1>
              <p className="mx-auto max-w-lg text-gray-400">
                {catalogLoading
                  ? "Refreshing the active catalog for this mode."
                  : "The catalog is empty right now. Once stories land, this front page will show them here."}
              </p>
            </div>
          </main>
        </FigmaChrome>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-500",
        palette.rootBg,
      )}
    >
      <FigmaChrome>
        <div className="relative w-full overflow-hidden bg-black transition-all duration-700">
          <div className="absolute inset-0">
            <img
              src={resolveDisplayImageUrl(heroItem.coverUrl, {
                kind: "cover",
                adult: heroItem?.adult || heroItem?.isAdult,
              })}
              alt={heroItem.title}
              className="h-full w-full scale-110 object-cover opacity-30 blur-2xl"
            />
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-t from-10% to-transparent",
                palette.heroOverlay,
              )}
            />
          </div>

          <div className="relative mx-auto flex max-w-[1600px] justify-center px-4 py-8 md:px-8 md:py-18 lg:py-22">
            <div className="flex w-full max-w-6xl flex-col items-center justify-center gap-5 md:flex-row md:gap-10 lg:gap-24">
              <div className="order-2 max-w-2xl flex-1 md:order-1">
                <div className="mb-3 flex flex-wrap gap-2 md:mb-6">
                  {heroItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-sm md:px-3 md:text-xs",
                        palette.primarySoft,
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="flex items-center gap-1 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
                    <Star className="h-3 w-3 fill-current" />
                    {heroItem.rating}
                  </span>
                </div>

                <h1 className="mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-[2.25rem] font-black leading-[1.06] tracking-tight text-transparent drop-shadow-sm md:mb-6 md:text-6xl lg:text-7xl">
                  {heroItem.title}
                </h1>

                <p className="mb-5 max-w-xl text-sm leading-6 text-gray-300 md:mb-8 md:text-lg md:leading-relaxed">
                  {heroItem.description}
                </p>

                <div className="flex flex-wrap items-stretch gap-3 sm:items-center sm:gap-4">
                  <Link
                    href={heroItem.readHref}
                    onClick={() => handleStoryClick(heroItem, "home_hero", 1)}
                    className={cn(
                      "flex min-h-[52px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:scale-95 sm:w-auto md:px-8 md:py-4 md:text-base",
                      palette.primaryBg,
                    )}
                  >
                    <ActionIcon className="h-6 w-6" />
                    {heroItem.readLabel || getReadLabel(contentType)}
                  </Link>
                  <Link
                    href={heroItem.detailHref}
                    onClick={() =>
                      handleStoryClick(heroItem, "home_hero_detail", 1)
                    }
                    className={cn(
                      "flex min-h-[52px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-white/10 active:scale-95 sm:w-auto md:px-8 md:py-4 md:text-base",
                      palette.surface,
                      palette.border,
                    )}
                  >
                    <History className="h-5 w-5" />
                    View Details
                  </Link>
                </div>
              </div>

              <div className="order-1 w-[58%] max-w-[230px] md:order-2 md:w-[32%] md:max-w-sm">
                <Link href={heroItem.detailHref}>
                  <div
                    className={cn(
                      "group relative aspect-[3/4] overflow-hidden rounded-2xl shadow-2xl shadow-black ring-1 transition-all",
                      palette.ring,
                    )}
                  >
                    <img
                      src={resolveDisplayImageUrl(heroItem.coverUrl, {
                        kind: "cover",
                        adult: heroItem?.adult || heroItem?.isAdult,
                      })}
                      alt={heroItem.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between md:bottom-4 md:left-4 md:right-4">
                      <div>
                        <p className="max-w-[140px] truncate text-base font-bold text-white md:max-w-[150px] md:text-lg">
                          {heroItem.title}
                        </p>
                        <p className="text-sm text-gray-300">
                          {heroItem.author}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-300">
                          Latest
                        </span>
                        <span className="rounded bg-white px-2 py-1 text-xs font-black text-black">
                          {heroItem.latestInstallmentLabel ||
                            heroItem.chapterLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-8 md:py-8">
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-4">
            <div
              className={cn(
                "rounded-3xl border p-4 shadow-xl md:p-6 lg:col-span-3",
                palette.surface,
                palette.border,
              )}
            >
              <div className="mb-3 flex items-center gap-2 md:mb-4">
                <Filter className="h-5 w-5 text-gray-400" />
                <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-white">
                  Genres
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleGenreSelect(genre)}
                    className={cn(
                      "rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 md:px-4 md:text-sm",
                      activeGenre === genre
                        ? cn(palette.primaryBg, "text-white shadow-lg")
                        : "border border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={cn(
                "flex flex-col justify-between rounded-3xl border p-4 shadow-xl md:p-6",
                palette.surface,
                palette.border,
              )}
            >
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-white md:mb-4">
                  Sort By
                </h3>
                <div className="space-y-2">
                  {SORTS.map((sort) => (
                    <button
                      key={sort}
                      type="button"
                      onClick={() => handleSortSelect(sort)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-xs font-bold transition-all md:text-sm",
                        activeSort === sort
                          ? "border border-white/10 bg-white/10 text-white"
                          : "text-gray-500 hover:bg-white/5 hover:text-gray-300",
                      )}
                    >
                      {sort}
                      {activeSort === sort ? (
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            palette.primaryMuted,
                          )}
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 pb-10 md:gap-12 md:px-8 md:pb-12 xl:flex-row">
          <div className="min-w-0 flex-1">
            <section className="mb-10 md:mb-16">
              <div className="mb-4 flex items-center justify-between md:mb-6">
                <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white md:text-2xl">
                  {contentType === FIGMA_CONTENT_TYPES.INTERACTIVE ? (
                    <Swords className={cn("h-6 w-6", palette.primaryText)} />
                  ) : (
                    <History className={cn("h-6 w-6", palette.primaryText)} />
                  )}
                  {continueSectionTitle}
                </h2>
                <Link
                  href="/account"
                  className="flex items-center text-sm font-semibold text-gray-400 transition-colors hover:text-white"
                >
                  My Library
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                {continueItems.map((item, index) => (
                  <Link
                    key={`continue-${item.id}`}
                    href={item.readHref}
                    onClick={() =>
                      handleStoryClick(item, "continue_reading", index + 1)
                    }
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border p-3 shadow-sm transition-all hover:shadow-md active:scale-[0.98] md:gap-4 md:p-4",
                      palette.surface,
                      palette.border,
                    )}
                  >
                    <div className="relative h-[72px] w-14 shrink-0 overflow-hidden rounded-md md:h-20 md:w-16">
                      <img
                        src={resolveDisplayImageUrl(item.coverUrl, {
                          kind: "cover",
                          adult: item?.adult || item?.isAdult,
                        })}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <ActionIcon
                          className={cn("h-6 w-6", palette.primaryText)}
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold text-white transition-colors group-hover:text-gray-200 md:text-base">
                        {item.title}
                      </h4>
                      <p className="mb-2 text-sm text-gray-400">
                        {item.hasProgress
                          ? `Continue from ${item.ctaChapterLabel}`
                          : `Start with ${item.ctaChapterLabel}`}
                      </p>
                      {item.hasProgress ? (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              palette.primaryBg,
                            )}
                            style={{ width: "45%" }}
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Ready to start
                        </p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110 md:h-10 md:w-10",
                        palette.primarySoft,
                      )}
                    >
                      <ActionIcon className="h-5 w-5" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="mb-10 md:mb-16">
              <div className="mb-4 flex items-center justify-between md:mb-6">
                <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white md:text-2xl">
                  <Sparkles className={cn("h-6 w-6", palette.primaryText)} />
                  Editor&apos;s Choice
                </h2>
              </div>

              <div
                className={cn(
                  "overflow-hidden rounded-[28px] border p-3 shadow-xl md:rounded-[32px] md:p-4",
                  palette.surface,
                  palette.border,
                )}
              >
                <div className="mb-4 flex items-center justify-between px-1 md:mb-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 md:text-xs">
                      Curated Grid
                    </p>
                    <p className="mt-1 text-sm text-gray-400 md:text-base">
                      Hand-picked picks with stronger shelf presence.
                    </p>
                  </div>
                  <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-gray-300 md:block">
                    Updated hourly
                  </div>
                </div>

                <div className="grid h-auto grid-cols-1 gap-3 md:h-[500px] md:grid-cols-4 md:gap-4">
                  {gridItems[0] ? (
                    <Link
                      href={gridItems[0].detailHref}
                      className="group relative block h-[260px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 transition-all hover:ring-white/30 md:col-span-2 md:row-span-2 md:h-full"
                    >
                      <img
                        src={resolveDisplayImageUrl(gridItems[0].coverUrl, {
                          kind: "cover",
                          adult: gridItems[0]?.adult || gridItems[0]?.isAdult,
                        })}
                        alt={gridItems[0].title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 w-full p-5 md:p-6">
                        <span
                          className={cn(
                            "mb-3 inline-block rounded-md px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white",
                            palette.primaryBg,
                          )}
                        >
                          Masterpiece
                        </span>
                        <h3 className="mb-2 text-xl font-black leading-tight text-white transition-colors group-hover:text-gray-200 md:text-3xl">
                          {gridItems[0].title}
                        </h3>
                        <p className="line-clamp-2 text-sm text-gray-300 md:max-w-[80%]">
                          {gridItems[0].description}
                        </p>
                      </div>
                    </Link>
                  ) : null}

                  {gridItems[1] ? (
                    <Link
                      href={gridItems[1].detailHref}
                      className="group relative block h-[170px] overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10 transition-all hover:ring-white/30 md:col-span-2 md:row-span-1 md:h-full"
                    >
                      <img
                        src={resolveDisplayImageUrl(gridItems[1].coverUrl, {
                          kind: "cover",
                          adult: gridItems[1]?.adult || gridItems[1]?.isAdult,
                        })}
                        alt={gridItems[1].title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 w-full p-4 md:p-5">
                        <span className="mb-2 inline-block rounded-md bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-md">
                          Trending
                        </span>
                        <h3 className="truncate text-lg font-black leading-tight text-white transition-colors group-hover:text-gray-200 md:text-xl">
                          {gridItems[1].title}
                        </h3>
                      </div>
                    </Link>
                  ) : null}

                  {gridItems.slice(2, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={item.detailHref}
                      className="group relative block h-[170px] overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10 transition-all hover:ring-white/30 md:h-full"
                    >
                      <img
                        src={resolveDisplayImageUrl(item.coverUrl, {
                          kind: "cover",
                          adult: item?.adult || item?.isAdult,
                        })}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                      <div className="absolute bottom-0 left-0 w-full p-4">
                        <h3 className="line-clamp-2 text-base font-bold leading-tight text-white transition-colors group-hover:text-gray-200">
                          {item.title}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {item.rating}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <section className="mb-10 md:mb-16">
              <div className="mb-4 flex items-center justify-between md:mb-6">
                <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white md:text-2xl">
                  <Calendar className={cn("h-6 w-6", palette.primaryText)} />
                  {activeGenre === "All" && activeSort === "Trending"
                    ? updatesLabel
                    : "Filter Results"}
                </h2>
                {activeGenre !== "All" || activeSort !== "Trending" ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full animate-pulse",
                        palette.primaryMuted,
                      )}
                    />
                    Live Updating
                  </div>
                ) : null}
              </div>

              {activeGenre === "All" && activeSort === "Trending" ? (
                <div className="mb-4 flex gap-2 overflow-x-auto border-b border-gray-800 pb-px md:mb-6">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setActiveDay(day)}
                      className={cn(
                        "whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-bold transition-all md:px-6 md:py-3 md:text-sm",
                        activeDay === day
                          ? cn(palette.primaryText, "border-current")
                          : "border-transparent text-gray-500 hover:text-gray-300",
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              ) : null}

              <div
                className={cn(
                  "rounded-[28px] border p-3 shadow-xl md:rounded-[32px] md:p-4",
                  palette.surface,
                  palette.border,
                )}
              >
                <div className="mb-4 flex items-center justify-between px-1 md:mb-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 md:text-xs">
                      Discovery Shelf
                    </p>
                    <p className="mt-1 text-sm text-gray-400 md:text-base">
                      Browse the active rotation without leaving the home feed.
                    </p>
                  </div>
                  <div className="hidden text-xs font-bold uppercase tracking-[0.18em] text-gray-500 md:block">
                    {activeGenre} / {activeSort}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 md:gap-5 lg:grid-cols-6">
                  {(activeGenre === "All" && activeSort === "Trending"
                    ? gridItems
                    : exploreGridItems
                  ).map((item, index) => (
                    <Link
                      key={`${item.id}-${index}`}
                      href={item.detailHref}
                      className="group block rounded-2xl border border-transparent p-2 transition-all hover:border-white/10 hover:bg-white/[0.03]"
                    >
                      <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-white/5">
                        <img
                          src={resolveDisplayImageUrl(item.coverUrl, {
                            kind: "cover",
                            adult: item?.adult || item?.isAdult,
                          })}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        {item.status ? (
                          <div
                            className={cn(
                              "absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-black tracking-[0.15em] text-white",
                              item.status === "UP" || item.status === "HOT"
                                ? palette.primaryBg
                                : "bg-green-600",
                            )}
                          >
                            {item.status}
                          </div>
                        ) : null}
                        {item.latestInstallmentLabel ? (
                          <div className="absolute bottom-2 right-2 rounded-full border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                            {item.latestInstallmentLabel}
                          </div>
                        ) : null}
                      </div>

                      <h3 className="min-h-[2.5rem] line-clamp-2 text-sm font-bold leading-tight text-white transition-colors group-hover:text-gray-300 md:text-base">
                        {item.title}
                      </h3>
                      <p className="mt-1 truncate text-[11px] font-medium text-gray-500 md:text-xs">
                        {item.author}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400 md:text-xs">
                        <span className="truncate">
                          {getDailyUpdateNote(item)}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-yellow-500">
                          <Star className="h-3 w-3 fill-current" />
                          {item.rating}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="w-full shrink-0 space-y-6 md:space-y-12 xl:w-[350px]">
            <div
              className={cn(
                "rounded-2xl border p-5 md:p-6",
                palette.surface,
                palette.border,
              )}
            >
              <div className="mb-5 flex items-center justify-between md:mb-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-white md:text-xl">
                  <Trophy className={cn("h-5 w-5", palette.primaryText)} />
                  {rankingLabel}
                </h3>
              </div>

              <div className="mb-6 flex items-center justify-between rounded-xl border border-white/10 bg-black/35 px-4 py-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                    Panel Logic
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-300">
                    {rankingMetaLabel}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                    palette.primarySoft,
                  )}
                >
                  {rankItems.length} picks
                </span>
              </div>

              <div className="space-y-3 md:space-y-4">
                {rankItems.map((item, index) => (
                  <Link
                    key={`rank-${item.id}`}
                    href={item.detailHref}
                    onClick={() =>
                      handleStoryClick(item, "top_rated_picks", index + 1)
                    }
                    className="group flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-white/5 active:scale-95 md:gap-4 md:p-2"
                  >
                    <span
                      className={cn(
                        "w-6 text-center text-2xl font-black drop-shadow-sm",
                        index < 3 ? palette.primaryText : "text-gray-600",
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded ring-1 ring-white/10 transition-all group-hover:ring-white/20">
                      <img
                        src={resolveDisplayImageUrl(item.coverUrl, {
                          kind: "cover",
                          adult: item?.adult || item?.isAdult,
                        })}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold text-white transition-colors group-hover:text-gray-200">
                        {item.title}
                      </h4>
                      <p className="truncate text-xs text-gray-400">
                        {item.author || item.tags[0] || "Featured pick"}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                        <History className="h-3 w-3" />
                        {getRankingItemNote(item)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                href="/rankings"
                className="mt-5 block w-full rounded-xl border border-white/10 py-2.5 text-center text-sm font-bold text-gray-300 transition-colors hover:bg-white/5 md:mt-6 md:py-3"
              >
                View Full Ranking
              </Link>
            </div>
          </div>
        </div>
      </FigmaChrome>
    </div>
  );
}

export default function FigmaHomePage({
  seriesList = [],
  initialContentType = FIGMA_CONTENT_TYPES.COMICS,
  initialReady = false,
  catalogSource = FIGMA_CATALOG_SOURCES.SERIES,
}) {
  return (
    <FigmaSiteProvider initialContentType={initialContentType}>
      <HomeContent
        seriesList={seriesList}
        initialReady={initialReady}
        catalogSource={catalogSource}
      />
    </FigmaSiteProvider>
  );
}
