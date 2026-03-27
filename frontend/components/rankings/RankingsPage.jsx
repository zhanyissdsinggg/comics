"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import CreatorShelfLinks from "../common/CreatorShelfLinks";
import Cover from "../common/Cover";
import { apiGet } from "../../lib/apiClient";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { getSearchParam } from "../../lib/pageSearchParams";

const VIEWS = [
  {
    id: "featured",
    label: "Featured",
    description: "A curated mix from across the catalog.",
  },
  {
    id: "start-here",
    label: "Start Here",
    description: "Reader-friendly stories with a strong first step.",
  },
  {
    id: "completed",
    label: "Completed",
    description: "Finished stories ready to read through.",
  },
  {
    id: "comics",
    label: "Comics",
    description: "Editorial picks in comics.",
  },
  {
    id: "novels",
    label: "Novels",
    description: "Editorial picks in novels.",
  },
];

function toTimestamp(value) {
  const parsed = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function hasReaderFriendlyStart(series) {
  return Number(series?.freeEpisodeCount || 0) > 0 || Boolean(series?.hasFreeEpisodes);
}

function getFeaturedScore(series) {
  return (
    toTimestamp(series?.updatedAt) +
    (hasReaderFriendlyStart(series) ? 1200 : 0) +
    (normalizeStatus(series?.status) === "completed" ? 700 : 0)
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
  return [
    String(series?.type || "").trim(),
    String(series?.status || "").trim(),
    String(series?.author || "").trim(),
  ].filter(Boolean);
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
      return sorted.filter((series) => normalizeStatus(series?.status) === "completed");
    case "comics":
      return sorted.filter((series) => String(series?.type || "").toLowerCase() === "comic");
    case "novels":
      return sorted.filter((series) => String(series?.type || "").toLowerCase() === "novel");
    case "featured":
    default:
      return sorted;
  }
}

function RankingsLoadingState() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_360px]">
      <div className="space-y-6">
        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="space-y-3">
            <div className="h-3 w-28 rounded-full bg-slate-200" />
            <div className="h-10 w-72 rounded-full bg-slate-200" />
            <div className="h-4 w-full max-w-2xl rounded-full bg-slate-100" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[26px] border border-black/6 bg-white/88 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]"
              >
                <div className="h-44 rounded-[20px] bg-slate-200" />
                <div className="mt-4 h-6 w-40 rounded-full bg-slate-200" />
                <div className="mt-3 h-4 w-full rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </SurfacePanel>
      </div>

      <SurfacePanel className="space-y-4" appearance="light" accent="blue">
        <div className="h-3 w-24 rounded-full bg-slate-200" />
        <div className="h-8 w-48 rounded-full bg-slate-200" />
        <div className="h-4 w-full rounded-full bg-slate-100" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-[20px] border border-black/6 bg-white/86"
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

export default function RankingsPage({
  initialSearchParams = {},
  initialSeries = [],
  hasInitialSeries = false,
}) {
  const router = useRouter();
  const [seriesList, setSeriesList] = useState(Array.isArray(initialSeries) ? initialSeries : []);
  const [loading, setLoading] = useState(!hasInitialSeries);
  const [commerceNotice, setCommerceNotice] = useState(null);
  const { isAdultMode } = useAdultGateStore();
  const activeViewId = normalizeView(initialSearchParams);
  const activeView = VIEWS.find((item) => item.id === activeViewId) || VIEWS[0];
  const featuredPath = `/rankings?view=${activeView.id}`;

  useEffect(() => {
    if (!hasInitialSeries) {
      setLoading(true);
    }
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/series?adult=${adultFlag}`).then((response) => {
      if (response.ok) {
        setSeriesList(Array.isArray(response.data?.series) ? response.data.series : []);
      } else {
        setSeriesList([]);
      }
      setLoading(false);
    });
  }, [hasInitialSeries, isAdultMode]);

  useEffect(() => {
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/rankings")));
  }, []);

  const curatedSeries = useMemo(
    () => filterSeriesForView(seriesList, activeView.id),
    [activeView.id, seriesList],
  );
  const leadEntry = curatedSeries[0] || null;
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

  const filterButtonClass = (isActive) =>
    [
      "rounded-full border px-4 py-2 text-xs font-semibold transition",
      isActive
        ? "border-black/10 bg-slate-950 text-white"
        : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[#f8f9fc] hover:text-slate-950",
    ].join(" ");

  const primaryButtonClass =
    "rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";

  return (
    <main className="gush-page-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="light" />
      <div className="gush-page-main gush-section-stack">
        <EditorialHero
          eyebrow="Featured Series"
          title="Editor’s picks and reader-friendly starting points."
          description={activeView.description}
          appearance="light"
        />

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        <div className="rounded-[24px] border border-black/6 bg-white/82 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
          <div className="flex flex-wrap gap-2">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.replace(`/rankings?view=${item.id}`)}
                className={filterButtonClass(activeView.id === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <RankingsLoadingState />
        ) : curatedSeries.length === 0 ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_360px]">
            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Featured Series
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Nothing is featured here yet.
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Browse the catalog directly or switch to another editorial view.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/comics")}
                  className={primaryButtonClass}
                >
                  Browse Comics
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/novels")}
                  className={secondaryButtonClass}
                >
                  Browse Novels
                </button>
              </div>
            </SurfacePanel>

            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Creators
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Meet the Creators
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Browse the writers, artists, and studios behind the stories.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/creators")}
                className={secondaryButtonClass}
              >
                View Creators
              </button>
            </SurfacePanel>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_360px]">
            <div className="space-y-6">
              {leadEntry ? (
                <Link
                  href={`/series/${encodeURIComponent(leadEntry.id)}`}
                  onClick={(event) => handleSeriesLinkClick(event, leadEntry.id, "FEATURED_LEAD")}
                  className="w-full rounded-[32px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] p-5 text-left shadow-[0_22px_52px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-black/10"
                  aria-label={`Open ${leadEntry.title}`}
                >
                  <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
                    <Cover
                      tone={leadEntry.coverTone}
                      coverUrl={leadEntry.coverUrl}
                      label={leadEntry.title}
                      eyebrow={activeView.label}
                      badge={leadEntry.badge}
                      genres={leadEntry.genres}
                      seriesType={leadEntry.type}
                      className="mx-auto aspect-[3/4] w-full max-w-[220px] rounded-[24px] lg:mx-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Featured
                      </p>
                      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                        {leadEntry.title}
                      </h2>
                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        {leadEntry.description || "A strong place to begin."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                        {getSeriesMeta(leadEntry).map((item) => (
                          <span
                            key={`${leadEntry.id}-lead-meta-${item}`}
                            className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1.5"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              ) : null}

              {supportingEntries.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {supportingEntries.map((series) => (
                    <Link
                      key={series.id}
                      href={`/series/${encodeURIComponent(series.id)}`}
                      onClick={(event) => handleSeriesLinkClick(event, series.id, "FEATURED_SUPPORTING")}
                      className="rounded-[26px] border border-black/6 bg-white/88 p-4 text-left shadow-[0_14px_32px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-black/10"
                      aria-label={`Open ${series.title}`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        {activeView.label}
                      </p>
                      <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                        {series.title}
                      </h3>
                      <Cover
                        tone={series.coverTone}
                        coverUrl={series.coverUrl}
                        label={series.title}
                        eyebrow={series.author || activeView.label}
                        badge={series.badge}
                        genres={series.genres}
                        seriesType={series.type}
                        className="mt-4 aspect-[3/4] w-full rounded-[20px]"
                      />
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                        {getSeriesMeta(series).map((item) => (
                          <span
                            key={`${series.id}-support-meta-${item}`}
                            className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1.5"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}

              {boardEntries.length > 0 ? (
                <SurfacePanel className="space-y-5" appearance="light" accent="blue">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    More Series
                  </p>

                  <div className="space-y-3">
                    {boardEntries.map((series) => (
                      <Link
                        key={series.id}
                        href={`/series/${encodeURIComponent(series.id)}`}
                        onClick={(event) => handleSeriesLinkClick(event, series.id, "FEATURED_LIST")}
                        className="flex w-full items-center gap-4 rounded-[24px] border border-black/6 bg-white/86 p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-black/10"
                        aria-label={`Open ${series.title}`}
                      >
                        <Cover
                          tone={series.coverTone}
                          coverUrl={series.coverUrl}
                          label={series.title}
                          eyebrow={series.author || activeView.label}
                          badge={series.badge}
                          genres={series.genres}
                          seriesType={series.type}
                          className="aspect-[3/4] w-[4.5rem] flex-shrink-0 rounded-[16px]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-slate-950">{series.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {getSeriesMeta(series).join(" / ")}
                          </p>
                          {Array.isArray(series.genres) && series.genres.length > 0 ? (
                            <p className="mt-1 truncate text-xs text-slate-400">
                              {series.genres.slice(0, 2).join(" / ")}
                            </p>
                          ) : null}
                        </div>
                        <span className="hidden rounded-full border border-black/8 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 sm:inline-flex">
                          View Series
                        </span>
                      </Link>
                    ))}
                  </div>
                </SurfacePanel>
              ) : null}
            </div>

            <div className="space-y-4">
              <CreatorShelfLinks
                items={curatedSeries}
                entryPoint="FEATURED_CREATOR_CHIP"
                campaignId={`featured_${activeView.id}_creator`}
                sourcePath={featuredPath}
                label="Meet the Creators"
                maxCreators={6}
                compact
                appearance="light"
                className="shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
              />

              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Browse
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Keep browsing
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/comics")}
                    className={primaryButtonClass}
                  >
                    Browse Comics
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/novels")}
                    className={secondaryButtonClass}
                  >
                    Browse Novels
                  </button>
                </div>
              </SurfacePanel>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
