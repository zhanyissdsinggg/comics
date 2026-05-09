"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import FigmaChrome from "./FigmaChrome";
import {
  FIGMA_CONTENT_TYPES,
  buildDisplayItems,
  buildFigmaCatalog,
  buildGenreOptions,
  cn,
  inferCatalogHero,
  sortByRating,
  sortByUpdated,
  filterByGenre,
} from "./figma-utils";

const SORTS = ["Trending", "Newest", "Highest Rated", "Most Views"];
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

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
  if (contentType === FIGMA_CONTENT_TYPES.NOVELS) {
    return "Start Reading";
  }
  return "Read First Chapter";
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
    return "Bestselling Novels";
  }
  return "Top Ranking";
}

function HomeContent({ seriesList = [] }) {
  const { palette, isAdultMode, contentType } = useFigmaSite();
  const [activeDay, setActiveDay] = useState("WED");
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeSort, setActiveSort] = useState("Trending");

  const catalog = useMemo(() => buildFigmaCatalog(seriesList), [seriesList]);
  const currentItems = useMemo(
    () => buildDisplayItems(contentType, catalog, isAdultMode),
    [catalog, contentType, isAdultMode],
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
        (left, right) => Number(right?.viewsValue || 0) - Number(left?.viewsValue || 0),
      );
    }
    return sortByRating(filteredByGenre);
  }, [activeSort, filteredByGenre]);

  const fallbackItems = currentItems.length > 0 ? currentItems : catalog.comics;
  const heroItem = inferCatalogHero(sortedItems) || inferCatalogHero(fallbackItems);
  const gridItems = [...sortedItems, ...sortedItems].slice(0, 6);
  const exploreGridItems = [...sortedItems, ...sortedItems, ...sortedItems].slice(0, 12);
  const rankItems = sortByRating(sortedItems).slice(0, 5);
  const genreOptions = buildGenreOptions(currentItems);

  const ActionIcon = getActionIcon(contentType);
  const readLabel = getReadLabel(contentType);
  const continueLabel = getContinueLabel(contentType);
  const updatesLabel = getUpdateLabel(contentType);
  const rankingLabel = getRankingLabel(contentType);

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
                No titles live yet
              </h1>
              <p className="mx-auto max-w-lg text-gray-400">
                The catalog is empty right now. Once stories land, this new front
                page will show them here.
              </p>
            </div>
          </main>
        </FigmaChrome>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen transition-colors duration-500", palette.rootBg)}>
      <FigmaChrome searchSuggestions={sortedItems.slice(0, 6)}>
        <div className="relative w-full overflow-hidden bg-black transition-all duration-700">
          <div className="absolute inset-0">
            <img
              src={heroItem.coverUrl}
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

          <div className="relative mx-auto flex max-w-[1600px] justify-center px-4 py-12 md:px-8 md:py-20 lg:py-24">
            <div className="flex w-full max-w-6xl flex-col items-center justify-center gap-8 md:flex-row lg:gap-24">
              <div className="order-2 max-w-2xl flex-1 md:order-1">
                <div className="mb-6 flex flex-wrap gap-2">
                  {heroItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-sm",
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

                <h1 className="mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-4xl font-black leading-[1.1] tracking-tight text-transparent drop-shadow-sm md:text-6xl lg:text-7xl">
                  {heroItem.title}
                </h1>

                <p className="mb-8 max-w-xl text-base leading-relaxed text-gray-300 md:text-lg">
                  {heroItem.description}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href={heroItem.readHref}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-8 py-4 font-bold text-white shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:scale-95",
                      palette.primaryBg,
                    )}
                  >
                    <ActionIcon className="h-6 w-6" />
                    {readLabel}
                  </Link>
                  <Link
                    href={heroItem.detailHref}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-8 py-4 font-bold text-white shadow-lg transition-all hover:bg-white/10 active:scale-95",
                      palette.surface,
                      palette.border,
                    )}
                  >
                    <History className="h-5 w-5" />
                    View Details
                  </Link>
                </div>
              </div>

              <div className="order-1 w-2/3 max-w-sm md:order-2 md:w-1/3">
                <Link href={heroItem.detailHref}>
                  <div
                    className={cn(
                      "group relative aspect-[3/4] overflow-hidden rounded-2xl shadow-2xl shadow-black ring-1 transition-all",
                      palette.ring,
                    )}
                  >
                    <img
                      src={heroItem.coverUrl}
                      alt={heroItem.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                      <div>
                        <p className="max-w-[150px] truncate text-lg font-bold text-white">
                          {heroItem.title}
                        </p>
                        <p className="text-sm text-gray-300">{heroItem.author}</p>
                      </div>
                      <span className="rounded bg-white px-2 py-1 text-xs font-black text-black">
                        {heroItem.chapterLabel}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div
              className={cn(
                "rounded-3xl border p-6 shadow-xl lg:col-span-3",
                palette.surface,
                palette.border,
              )}
            >
              <div className="mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-white">
                  Genres
                </h3>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setActiveGenre(genre)}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95",
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
                "flex flex-col justify-between rounded-3xl border p-6 shadow-xl",
                palette.surface,
                palette.border,
              )}
            >
              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-white">
                  Sort By
                </h3>
                <div className="space-y-2">
                  {SORTS.map((sort) => (
                    <button
                      key={sort}
                      type="button"
                      onClick={() => setActiveSort(sort)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-bold transition-all",
                        activeSort === sort
                          ? "border border-white/10 bg-white/10 text-white"
                          : "text-gray-500 hover:bg-white/5 hover:text-gray-300",
                      )}
                    >
                      {sort}
                      {activeSort === sort ? (
                        <div className={cn("h-2 w-2 rounded-full", palette.primaryMuted)} />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1600px] flex-col gap-12 px-4 pb-12 md:px-8 xl:flex-row">
          <div className="min-w-0 flex-1">
            <section className="mb-16">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
                  {contentType === FIGMA_CONTENT_TYPES.INTERACTIVE ? (
                    <Swords className={cn("h-6 w-6", palette.primaryText)} />
                  ) : (
                    <History className={cn("h-6 w-6", palette.primaryText)} />
                  )}
                  {continueLabel}
                </h2>
                <Link
                  href="/account"
                  className="flex items-center text-sm font-semibold text-gray-400 transition-colors hover:text-white"
                >
                  My Library
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {sortedItems.slice(0, 2).map((item) => (
                  <Link
                    key={`continue-${item.id}`}
                    href={item.readHref}
                    className={cn(
                      "group flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98]",
                      palette.surface,
                      palette.border,
                    )}
                  >
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md">
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <ActionIcon className={cn("h-6 w-6", palette.primaryText)} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-base font-bold text-white transition-colors group-hover:text-gray-200">
                        {item.title}
                      </h4>
                      <p className="mb-2 text-sm text-gray-400">
                        Continue from {item.chapterLabel}
                      </p>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                        <div
                          className={cn("h-full rounded-full", palette.primaryBg)}
                          style={{ width: "45%" }}
                        />
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110",
                        palette.primarySoft,
                      )}
                    >
                      <ActionIcon className="h-5 w-5" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="mb-16">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
                  <Sparkles className={cn("h-6 w-6", palette.primaryText)} />
                  Editor&apos;s Choice
                </h2>
              </div>

              <div className="grid h-auto grid-cols-1 gap-4 md:h-[500px] md:grid-cols-4">
                {gridItems[0] ? (
                  <Link
                    href={gridItems[0].detailHref}
                    className="group relative block h-[300px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 transition-all hover:ring-white/30 md:col-span-2 md:row-span-2 md:h-full"
                  >
                    <img
                      src={gridItems[0].coverUrl}
                      alt={gridItems[0].title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full p-6">
                      <span
                        className={cn(
                          "mb-3 inline-block rounded-md px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white",
                          palette.primaryBg,
                        )}
                      >
                        Masterpiece
                      </span>
                      <h3 className="mb-2 text-2xl font-black leading-tight text-white transition-colors group-hover:text-gray-200 md:text-3xl">
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
                    className="group relative block h-[200px] overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10 transition-all hover:ring-white/30 md:col-span-2 md:row-span-1 md:h-full"
                  >
                    <img
                      src={gridItems[1].coverUrl}
                      alt={gridItems[1].title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full p-5">
                      <span className="mb-2 inline-block rounded-md bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-md">
                        Trending
                      </span>
                      <h3 className="truncate text-xl font-black leading-tight text-white transition-colors group-hover:text-gray-200">
                        {gridItems[1].title}
                      </h3>
                    </div>
                  </Link>
                ) : null}

                {gridItems.slice(2, 4).map((item) => (
                  <Link
                    key={item.id}
                    href={item.detailHref}
                    className="group relative block h-[200px] overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10 transition-all hover:ring-white/30 md:h-full"
                  >
                    <img
                      src={item.coverUrl}
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
            </section>

            <section className="mb-16">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
                  <Calendar className={cn("h-6 w-6", palette.primaryText)} />
                  {activeGenre === "All" && activeSort === "Trending"
                    ? updatesLabel
                    : "Filter Results"}
                </h2>
                {activeGenre !== "All" || activeSort !== "Trending" ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                    <div className={cn("h-3 w-3 rounded-full animate-pulse", palette.primaryMuted)} />
                    Live Updating
                  </div>
                ) : null}
              </div>

              {activeGenre === "All" && activeSort === "Trending" ? (
                <div className="mb-6 flex gap-2 overflow-x-auto border-b border-gray-800 pb-px">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setActiveDay(day)}
                      className={cn(
                        "whitespace-nowrap border-b-2 px-6 py-3 text-sm font-bold transition-all",
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

              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 md:gap-6">
                {(activeGenre === "All" && activeSort === "Trending"
                  ? gridItems
                  : exploreGridItems
                ).map((item, index) => (
                  <Link
                    key={`${item.id}-${index}`}
                    href={item.detailHref}
                    className="group block"
                  >
                    <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-white/5">
                      <img
                        src={item.coverUrl}
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
                    </div>

                    <h3 className="line-clamp-2 text-sm font-bold leading-tight text-white transition-colors group-hover:text-gray-300 md:text-base">
                      {item.title}
                    </h3>
                    <p className="mt-1 flex items-center justify-between text-xs text-gray-400">
                      <span>{item.author}</span>
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-3 w-3 fill-current" />
                        {item.rating}
                      </span>
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="w-full shrink-0 space-y-12 xl:w-[350px]">
            <div
              className={cn(
                "rounded-2xl border p-6",
                palette.surface,
                palette.border,
              )}
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                  <Trophy className={cn("h-5 w-5", palette.primaryText)} />
                  {rankingLabel}
                </h3>
              </div>

              <div className="mb-6 flex gap-2 rounded-lg bg-black/40 p-1">
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs font-bold text-white",
                    palette.primaryBg,
                  )}
                >
                  Trending
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-md py-1.5 text-xs font-bold text-gray-400 transition-colors hover:text-white"
                >
                  New
                </button>
              </div>

              <div className="space-y-4">
                {rankItems.map((item, index) => (
                  <Link
                    key={`rank-${item.id}`}
                    href={item.detailHref}
                    className="group flex items-center gap-4 rounded-xl p-2 transition-colors hover:bg-white/5 active:scale-95"
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
                        src={item.coverUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold text-white transition-colors group-hover:text-gray-200">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-400">
                        {item.tags[0] || item.author}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                        <History className="h-3 w-3" />
                        Updated today
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                href="/rankings"
                className="mt-6 block w-full rounded-xl border border-white/10 py-3 text-center text-sm font-bold text-gray-300 transition-colors hover:bg-white/5"
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
}) {
  return (
    <FigmaSiteProvider initialContentType={initialContentType}>
      <HomeContent seriesList={seriesList} />
    </FigmaSiteProvider>
  );
}
