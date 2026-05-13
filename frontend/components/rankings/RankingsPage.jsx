"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import CreatorShelfLinks from "../common/CreatorShelfLinks";
import Cover from "../common/Cover";
import { apiGet } from "../../lib/apiClient";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { getSearchParam } from "../../lib/pageSearchParams";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import {
  filterContentByMode,
  getContentModeQueryParam,
} from "../../lib/contentFilters";
import {
  formatTitleCardCreator,
  formatTitleCardFormatStatus,
  formatTitleCardGenres,
} from "../../lib/titleCardText";

const VIEWS = [
  {
    id: "featured",
    label: "Trending",
    description: "The stories readers are opening most this week.",
  },
  {
    id: "start-here",
    label: "Top Picks",
    description: "Easy starts with strong early chapters.",
  },
  {
    id: "completed",
    label: "Finished",
    description: "Completed series ready to binge.",
  },
  {
    id: "comics",
    label: "Comics",
    description: "The comics readers are opening right now.",
  },
  {
    id: "novels",
    label: "Novels",
    description: "The novels readers are sticking with this week.",
  },
];

function toTimestamp(value) {
  const parsed = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getEpisodeCount(series) {
  return Math.max(0, Number(series?.episodeCount || 0));
}

function hasReaderFriendlyStart(series) {
  const episodeCount = getEpisodeCount(series);
  return episodeCount > 0 && episodeCount <= 24;
}

function getFeaturedScore(series) {
  return (
    toTimestamp(series?.updatedAt) +
    (hasReaderFriendlyStart(series) ? 12 * 24 * 60 * 60 * 1000 : 0) +
    (normalizeStatus(series?.status) === "completed"
      ? 10 * 24 * 60 * 60 * 1000
      : 0)
  );
}

function normalizeView(initialSearchParams = {}) {
  const requestedView = getSearchParam(initialSearchParams, "view", "featured");
  if (VIEWS.some((item) => item.id === requestedView)) {
    return requestedView;
  }

  const legacyType = getSearchParam(initialSearchParams, "type", "");
  if (legacyType === "ttf") {
    return "start-here";
  }
  if (legacyType === "completed") {
    return "completed";
  }
  if (legacyType === "popular" || legacyType === "new") {
    return "featured";
  }

  return "featured";
}

function getSeriesMeta(series) {
  const creatorName = resolveSeriesCreatorName(series);
  return {
    formatStatus: formatTitleCardFormatStatus(series?.type, series?.status),
    genres: formatTitleCardGenres(series?.genres, { limit: 3 }),
    creator: formatTitleCardCreator(creatorName),
  };
}

function sortFeaturedSeries(seriesList = []) {
  return [...seriesList].sort((left, right) => {
    const scoreDelta = getFeaturedScore(right) - getFeaturedScore(left);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return String(left?.title || "").localeCompare(String(right?.title || ""));
  });
}

function filterSeriesForView(seriesList = [], view = "featured") {
  const sorted = sortFeaturedSeries(seriesList);

  switch (view) {
    case "start-here":
      return sorted.filter((series) => hasReaderFriendlyStart(series));
    case "completed":
      return sorted.filter(
        (series) => normalizeStatus(series?.status) === "completed",
      );
    case "comics":
      return sorted.filter(
        (series) => String(series?.type || "").toLowerCase() === "comic",
      );
    case "novels":
      return sorted.filter(
        (series) => String(series?.type || "").toLowerCase() === "novel",
      );
    case "featured":
    default:
      return sorted;
  }
}

function RankingsLoadingState() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_360px]">
      <div className="space-y-6">
        <SurfacePanel className="space-y-5" appearance="dark" accent="rose">
          <div className="space-y-3">
            <div className="h-3 w-28 rounded-full bg-white/20" />
            <div className="h-10 w-72 rounded-full bg-white/20" />
            <div className="h-4 w-full max-w-2xl rounded-full bg-[#111111]" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 shadow-[0_18px_40px_rgba(8,6,20,0.22)]"
              >
                <div className="h-44 rounded-[20px] bg-white/20" />
                <div className="mt-4 h-6 w-40 rounded-full bg-white/20" />
                <div className="mt-3 h-4 w-full rounded-full bg-[#111111]" />
              </div>
            ))}
          </div>
        </SurfacePanel>
      </div>

      <SurfacePanel className="space-y-4" appearance="dark" accent="rose">
        <div className="h-3 w-24 rounded-full bg-white/20" />
        <div className="h-8 w-48 rounded-full bg-white/20" />
        <div className="h-4 w-full rounded-full bg-[#111111]" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[0_18px_40px_rgba(8,6,20,0.22)]"
            />
          ))}
        </div>
      </SurfacePanel>
    </div>
  );
}

function isModifiedEvent(event) {
  return Boolean(
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.button !== 0,
  );
}

function RankingsSectionHeader({
  eyebrow,
  title,
  description = "",
  meta = "",
  actions = null,
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-[42rem]">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 font-display text-[2rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:text-[2.6rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-[34rem] text-sm leading-7 text-white/72">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {meta ? (
          <span className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.04)] px-3.5 py-2 text-xs font-medium uppercase tracking-[0.16em] text-white/76 shadow-[0_10px_24px_rgba(8,6,20,0.18)]">
            {meta}
          </span>
        ) : null}
        {actions}
      </div>
    </div>
  );
}

export default function RankingsPage({
  initialSearchParams = {},
  initialSeries = [],
  hasInitialSeries = false,
}) {
  const router = useRouter();
  const { contentMode, isAdultMode } = useAdultGateStore();
  const [seriesList, setSeriesList] = useState(
    filterContentByMode(
      Array.isArray(initialSeries) ? initialSeries : [],
      contentMode,
    ),
  );
  const [loading, setLoading] = useState(!hasInitialSeries);
  const [commerceNotice, setCommerceNotice] = useState(null);
  const activeViewId = normalizeView(initialSearchParams);
  const activeView = VIEWS.find((item) => item.id === activeViewId) || VIEWS[0];
  const featuredPath = `/rankings?view=${activeView.id}`;

  useEffect(() => {
    if (!hasInitialSeries) {
      setLoading(true);
    }
    const adultFlag = getContentModeQueryParam(contentMode);
    apiGet(`/api/rankings?adult=${adultFlag}&type=popular`).then((response) => {
      if (response.ok) {
        const rankings = filterContentByMode(
          Array.isArray(response.data?.rankings) ? response.data.rankings : [],
          contentMode,
        );
        if (rankings.length > 0) {
          setSeriesList(rankings);
          setLoading(false);
          return;
        }
      }

      apiGet(`/api/series?adult=${adultFlag}`).then((fallbackResponse) => {
        if (fallbackResponse.ok) {
          setSeriesList(
            filterContentByMode(
              Array.isArray(fallbackResponse.data?.series)
                ? fallbackResponse.data.series
                : [],
              contentMode,
            ),
          );
        } else {
          setSeriesList([]);
        }
        setLoading(false);
      });
    });
  }, [activeView.id, contentMode, hasInitialSeries]);

  useEffect(() => {
    setCommerceNotice(
      getCommerceSuccessPresentation(
        consumeCommerceSuccessForPath("/rankings"),
      ),
    );
  }, []);

  const curatedSeries = useMemo(
    () => filterSeriesForView(seriesList, activeView.id),
    [activeView.id, seriesList],
  );
  const leadEntry = curatedSeries[0] || null;
  const leadMeta = leadEntry ? getSeriesMeta(leadEntry) : null;
  const supportingEntries = curatedSeries.slice(1, 3);
  const boardEntries = curatedSeries.slice(3, 12);
  const handleSeriesClick = useCallback(
    (seriesId, entryPoint = "FEATURED_SERIES") => {
      const targetPath = `/series/${seriesId}`;
      trackEvent("featured_series_click", {
        seriesId,
        entryPoint,
        featuredView: activeView.id,
      });
      router.push(
        buildPathWithAttribution(targetPath, {
          entryPoint,
          campaignId: `featured_${activeView.id}`,
          sourcePath: featuredPath,
          sourceSeriesId: seriesId,
          returnTo: targetPath,
        }),
      );
    },
    [activeView.id, featuredPath, router],
  );

  const handleSeriesLinkClick = useCallback(
    (event, seriesId, entryPoint = "FEATURED_SERIES") => {
      if (isModifiedEvent(event)) {
        return;
      }

      event.preventDefault();
      handleSeriesClick(seriesId, entryPoint);
    },
    [handleSeriesClick],
  );

  const primaryButtonClass =
    "rounded-full border border-[rgba(255,79,154,0.28)] bg-[linear-gradient(135deg,#ff4f9a_0%,#ff76ad_100%)] px-4 py-2.5 text-sm font-semibold text-[#1a0e16] shadow-[0_18px_36px_rgba(255,79,154,0.2)] transition-transform hover:-translate-y-0.5";
  const secondaryButtonClass =
    "rounded-full border border-white/12 bg-[rgba(255,255,255,0.04)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-transform hover:-translate-y-0.5 hover:border-white/16 hover:bg-[rgba(255,255,255,0.08)]";
  const heroTitle = "Trending Stories";
  const heroDescription = isAdultMode
    ? "Adult-only stories readers are opening most right now."
    : "The stories readers are opening most this week.";

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#0f0d13_0%,#130f18_44%,#17131d_100%)] text-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-4 py-6 md:gap-8 md:px-8 md:py-10">
        <section>
          <EditorialHero
            eyebrow=""
            title={heroTitle}
            description={heroDescription}
            secondary=""
            className="min-h-full"
            appearance="dark"
            accent="rose"
          />
        </section>

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {loading ? (
          <RankingsLoadingState />
        ) : curatedSeries.length === 0 ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.28fr)_360px]">
            <SurfacePanel className="space-y-4" appearance="dark" accent="rose">
              <div>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-white">
                  Nothing here yet.
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/comics")}
                  className={primaryButtonClass}
                >
                  Comics
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/novels")}
                  className={secondaryButtonClass}
                >
                  Novels
                </button>
              </div>
            </SurfacePanel>

            <SurfacePanel className="space-y-4" appearance="dark" accent="rose">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
                  Keep reading
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-white">
                  Find your next pick
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/search" className={secondaryButtonClass}>
                  Search
                </Link>
                <Link href="/novels" className={secondaryButtonClass}>
                  Novels
                </Link>
              </div>
            </SurfacePanel>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.28fr)_360px]">
            <div className="space-y-6">
              {leadEntry ? (
                <Link
                  href={`/series/${encodeURIComponent(leadEntry.id)}`}
                  onClick={(event) =>
                    handleSeriesLinkClick(event, leadEntry.id, "FEATURED_LEAD")
                  }
                  className="group w-full rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,20,34,0.98)_0%,rgba(17,13,24,0.98)_100%)] p-3.5 text-left text-white shadow-[0_26px_68px_rgba(8,6,20,0.3)] transition-all duration-200 hover:-translate-y-1 hover:border-white/16 sm:p-5"
                  aria-label={`View ${leadEntry.title}`}
                >
                  <div className="grid gap-3.5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-5">
                    <Cover
                      tone={leadEntry.coverTone}
                      coverUrl={leadEntry.coverUrl}
                      label={leadEntry.title}
                      eyebrow=""
                      badge=""
                      genres={[]}
                      seriesType=""
                      decorative
                      fallbackVariant="minimal-card"
                      className="mx-auto aspect-[3/4] w-full max-w-[220px] rounded-[24px] transition-transform duration-500 group-hover:scale-[1.02] lg:mx-0"
                    />
                    <div className="min-w-0">
                      <h2 className="mt-2.5 font-display text-[1.75rem] font-semibold tracking-[-0.05em] text-white sm:mt-3 sm:text-4xl">
                        {leadEntry.title}
                      </h2>
                      {leadMeta?.formatStatus ? (
                        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-white/58">
                          {leadMeta.formatStatus}
                        </p>
                      ) : null}
                      {leadMeta?.genres ? (
                        <p className="mt-2 text-sm text-white/72">
                          {leadMeta.genres}
                        </p>
                      ) : null}
                      {leadMeta?.creator ? (
                        <p className="mt-2 text-sm text-white/52">
                          {leadMeta.creator}
                        </p>
                      ) : null}
                      <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-white/62">
                        View title
                      </p>
                    </div>
                  </div>
                </Link>
              ) : null}

              {supportingEntries.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                  {supportingEntries.map((series) => {
                    const seriesMeta = getSeriesMeta(series);

                    return (
                      <Link
                        key={series.id}
                        href={`/series/${encodeURIComponent(series.id)}`}
                        onClick={(event) =>
                          handleSeriesLinkClick(
                            event,
                            series.id,
                            "FEATURED_SUPPORTING",
                          )
                        }
                        className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,20,34,0.98)_0%,rgba(17,13,24,0.98)_100%)] p-3 text-left text-white shadow-[0_20px_52px_rgba(8,6,20,0.24)] transition-all duration-200 hover:-translate-y-1 hover:border-white/16 sm:p-4"
                        aria-label={`View ${series.title}`}
                      >
                        <h3 className="mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.05em] text-white sm:text-2xl">
                          {series.title}
                        </h3>
                        <Cover
                          tone={series.coverTone}
                          coverUrl={series.coverUrl}
                          label={series.title}
                          eyebrow=""
                          badge=""
                          genres={[]}
                          seriesType=""
                          decorative
                          fallbackVariant="minimal-card"
                          className="mt-4 aspect-[3/4] w-full rounded-[20px] transition-transform duration-500 group-hover:scale-[1.015]"
                        />
                        {seriesMeta.formatStatus ? (
                          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-white/58">
                            {seriesMeta.formatStatus}
                          </p>
                        ) : null}
                        {seriesMeta.genres ? (
                          <p className="mt-2 text-sm text-white/72">
                            {seriesMeta.genres}
                          </p>
                        ) : null}
                        {seriesMeta.creator ? (
                          <p className="mt-2 text-sm text-white/52">
                            {seriesMeta.creator}
                          </p>
                        ) : null}
                        <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-white/62">
                          View title
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : null}

              {boardEntries.length > 0 ? (
                <section className="space-y-4 rounded-[30px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-3.5 text-white shadow-[0_20px_52px_rgba(8,6,20,0.22)] sm:space-y-5 sm:p-6">
                  <RankingsSectionHeader
                    eyebrow=""
                    title="More trending stories"
                    description="Keep reading what readers are opening next."
                  />

                  <div className="space-y-3">
                    {boardEntries.map((series) => {
                      const seriesMeta = getSeriesMeta(series);

                      return (
                        <Link
                          key={series.id}
                          href={`/series/${encodeURIComponent(series.id)}`}
                          onClick={(event) =>
                            handleSeriesLinkClick(
                              event,
                              series.id,
                              "FEATURED_LIST",
                            )
                          }
                          className="flex w-full items-center gap-4 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-3 text-left text-white shadow-[0_16px_40px_rgba(8,6,20,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/16"
                          aria-label={`View ${series.title}`}
                        >
                          <Cover
                            tone={series.coverTone}
                            coverUrl={series.coverUrl}
                            label={series.title}
                            eyebrow=""
                            badge=""
                            genres={[]}
                            seriesType=""
                            decorative
                            fallbackVariant="minimal-card"
                            className="aspect-[3/4] w-[4.5rem] flex-shrink-0 rounded-[16px]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold tracking-[-0.02em] text-white">
                              {series.title}
                            </p>
                            {seriesMeta.formatStatus ? (
                              <p className="mt-1 text-xs font-medium text-white/58">
                                {seriesMeta.formatStatus}
                              </p>
                            ) : null}
                            {seriesMeta.genres ? (
                              <p className="mt-1 truncate text-xs font-medium text-white/46">
                                {seriesMeta.genres}
                              </p>
                            ) : null}
                            {seriesMeta.creator ? (
                              <p className="mt-1 truncate text-xs font-medium text-white/40">
                                {seriesMeta.creator}
                              </p>
                            ) : null}
                          </div>
                          <span className="inline-flex rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(8,6,20,0.18)]">
                            View title
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="space-y-4">
              <CreatorShelfLinks
                items={curatedSeries}
                entryPoint="FEATURED_CREATOR_CHIP"
                campaignId={`featured_${activeView.id}_creator`}
                sourcePath={featuredPath}
                label="Creators"
                maxCreators={6}
                compact
                appearance="dark"
                className=""
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
