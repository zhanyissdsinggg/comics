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
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { getSearchParam } from "../../lib/pageSearchParams";

const VIEWS = [
  {
    id: "featured",
    label: "Featured",
    description: "Editorial picks.",
  },
  {
    id: "start-here",
    label: "First Picks",
    description: "Easy starts.",
  },
  {
    id: "completed",
    label: "Completed",
    description: "Complete stories.",
  },
  {
    id: "comics",
    label: "Comics",
    description: "Comic picks.",
  },
  {
    id: "novels",
    label: "Novels",
    description: "Novel picks.",
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

function isRecentlyUpdated(series, days = 21) {
  const updatedAt = toTimestamp(series?.updatedAt);
  if (!updatedAt) {
    return false;
  }

  return updatedAt >= Date.now() - days * 24 * 60 * 60 * 1000;
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

function getSeriesBadge(series) {
  if (normalizeStatus(series?.status) === "completed") {
    return "Completed";
  }
  if (isRecentlyUpdated(series, 14)) {
    return "Updated";
  }
  if (hasReaderFriendlyStart(series)) {
    return "First picks";
  }
  return "";
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
  return [
    String(series?.type || "").trim(),
    String(series?.status || "").trim(),
    creatorName,
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
                className="border-[3px] border-black bg-white p-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)]"
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
              className="h-20 border-[3px] border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
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
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-[2.15rem] font-black uppercase leading-[0.94] tracking-[-0.05em] text-black sm:text-[2.8rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-[34rem] text-sm font-semibold leading-7 text-black/68">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {meta ? (
          <span className="border-[3px] border-black bg-white px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
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
  const [seriesList, setSeriesList] = useState(
    Array.isArray(initialSeries) ? initialSeries : [],
  );
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
    apiGet(`/api/rankings?adult=${adultFlag}&view=${activeView.id}`).then(
      (response) => {
        if (response.ok) {
          const rankings = Array.isArray(response.data?.rankings)
            ? response.data.rankings
            : [];
          if (rankings.length > 0) {
            setSeriesList(rankings);
            setLoading(false);
            return;
          }
        }

        apiGet(`/api/series?adult=${adultFlag}`).then((fallbackResponse) => {
          if (fallbackResponse.ok) {
            setSeriesList(
              Array.isArray(fallbackResponse.data?.series)
                ? fallbackResponse.data.series
                : [],
            );
          } else {
            setSeriesList([]);
          }
          setLoading(false);
        });
      },
    );
  }, [activeView.id, hasInitialSeries, isAdultMode]);

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
  const supportingEntries = curatedSeries.slice(1, 3);
  const boardEntries = curatedSeries.slice(3, 12);
  const heroStats = [
    {
      label: "Shelf",
      value: activeView.label,
      hint: activeView.description,
    },
    {
      label: "Titles",
      value: loading ? "..." : curatedSeries.length.toLocaleString(),
      hint: loading ? "Refreshing this edit." : "Curated stories in this view.",
    },
  ];

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
    "border-[3px] border-black bg-[#ff007a] px-4 py-2 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#e1006d] hover:shadow-none";
  const secondaryButtonClass =
    "border-[3px] border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:shadow-none";

  return (
    <main className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <div className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            eyebrow="Editor's shelf"
            title={`${activeView.label}.`}
            description={activeView.description}
            secondary=""
            stats={heroStats}
            className="min-h-full"
            appearance="light"
            accent="blue"
          />

          <SurfacePanel
            tone="default"
            accent="amber"
            appearance="dark"
            className="flex h-full flex-col justify-between space-y-6 border-[3px] border-black bg-black p-5 text-white shadow-[10px_10px_0_0_rgba(255,229,0,1)]"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ffe500]">
                Ranking desk
              </p>
              <div>
                <h2 className="text-[1.9rem] font-black uppercase leading-[0.94] tracking-[-0.05em] text-white">
                  {activeView.label}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-white/72">
                  Use this shelf when you want a fast editorial read lane instead of a broad search.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="border-[3px] border-black bg-[#ffe500] px-4 py-3 text-black shadow-[4px_4px_0_0_rgba(255,255,255,0.18)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/55">
                  Shelf
                </p>
                <p className="mt-2 text-[1.35rem] font-black uppercase tracking-[-0.04em]">
                  {activeView.label}
                </p>
              </div>
              <div className="border-[3px] border-black bg-[#00e5ff] px-4 py-3 text-black shadow-[4px_4px_0_0_rgba(255,255,255,0.18)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/55">
                  Titles
                </p>
                <p className="mt-2 text-[1.35rem] font-black uppercase tracking-[-0.04em]">
                  {loading ? "..." : curatedSeries.length.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/62">
                Next
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => router.push("/comics")}
                  className={primaryButtonClass}
                >
                  Browse Comics
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/creators")}
                  className={secondaryButtonClass}
                >
                  Open creators
                </button>
              </div>
            </div>
          </SurfacePanel>
        </section>

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        <SurfacePanel
          tone="muted"
          accent="blue"
          appearance="light"
          className="space-y-4 border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
        >
          <RankingsSectionHeader
            eyebrow="Views"
            title="Switch the shelf"
            description="Move between editorial views without leaving the ranked browsing flow."
          />
          <div className="flex flex-wrap gap-2.5">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.replace(`/rankings?view=${item.id}`)}
                className={[
                  "border-[3px] px-4 py-2.5 text-sm font-black uppercase tracking-[0.06em] transition-all",
                  activeView.id === item.id
                    ? "border-black bg-[#00e5ff] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                    : "border-black bg-white text-black/62 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#fff6c7] hover:text-black hover:shadow-none",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </SurfacePanel>

        {loading ? (
          <RankingsLoadingState />
        ) : curatedSeries.length === 0 ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_360px]">
            <SurfacePanel
              className="space-y-4"
              appearance="light"
              accent="blue"
            >
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                  View
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-black">
                  No titles yet.
                </h2>
                <p className="mt-3 text-sm font-medium leading-7 text-black/68">
                  Browse catalog or switch views.
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

            <SurfacePanel
              className="space-y-4"
              appearance="light"
              accent="blue"
            >
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                  Creators
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-black">
                  Creators
                </h2>
                <p className="mt-3 text-sm font-medium leading-7 text-black/68">
                  Browse creator profiles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/creators")}
                className={secondaryButtonClass}
              >
                Open creators
              </button>
            </SurfacePanel>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_360px]">
            <div className="space-y-6">
              {leadEntry ? (
                <Link
                  href={`/series/${encodeURIComponent(leadEntry.id)}`}
                  onClick={(event) =>
                    handleSeriesLinkClick(event, leadEntry.id, "FEATURED_LEAD")
                  }
                  className="group w-full border-[3px] border-black bg-[#ff007a] p-5 text-left text-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                  aria-label={`Open ${leadEntry.title}`}
                >
                  <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <Cover
                      tone={leadEntry.coverTone}
                      coverUrl={leadEntry.coverUrl}
                      label={leadEntry.title}
                      eyebrow={activeView.label}
                      badge={getSeriesBadge(leadEntry)}
                      genres={leadEntry.genres}
                      seriesType={leadEntry.type}
                      className="mx-auto aspect-[3/4] w-full max-w-[220px] rounded-[24px] transition-transform duration-500 group-hover:scale-[1.02] lg:mx-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/72">
                        Lead pick
                      </p>
                      <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.05em] text-white sm:text-4xl">
                        {leadEntry.title}
                      </h2>
                      <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/84">
                        {leadEntry.description || "A strong place to begin."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        {getSeriesMeta(leadEntry).map((item) => (
                          <span
                            key={`${leadEntry.id}-lead-meta-${item}`}
                            className="border-[3px] border-black bg-[#00e5ff] px-3 py-1.5 font-black uppercase tracking-[0.08em] text-black"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-white/72">
                        Open story
                      </p>
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
                      onClick={(event) =>
                        handleSeriesLinkClick(
                          event,
                          series.id,
                          "FEATURED_SUPPORTING",
                        )
                      }
                      className="group border-[3px] border-black bg-white p-4 text-left shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#fff6c7] hover:shadow-none"
                      aria-label={`Open ${series.title}`}
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                        {activeView.label}
                      </p>
                      <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-black">
                        {series.title}
                      </h3>
                      <Cover
                        tone={series.coverTone}
                        coverUrl={series.coverUrl}
                        label={series.title}
                        eyebrow={
                          resolveSeriesCreatorName(series) || activeView.label
                        }
                        badge={getSeriesBadge(series)}
                        genres={series.genres}
                        seriesType={series.type}
                        className="mt-4 aspect-[3/4] w-full rounded-[20px] transition-transform duration-500 group-hover:scale-[1.015]"
                      />
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        {getSeriesMeta(series).map((item) => (
                          <span
                            key={`${series.id}-support-meta-${item}`}
                            className="border-[3px] border-black bg-white px-3 py-1.5 font-black uppercase tracking-[0.08em] text-black/62"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-black/55">
                        Open story
                      </p>
                    </Link>
                  ))}
                </div>
              ) : null}

              {boardEntries.length > 0 ? (
                <SurfacePanel
                  className="space-y-5 border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
                  appearance="light"
                  accent="blue"
                >
                  <RankingsSectionHeader
                    eyebrow="More titles"
                    title="Keep browsing"
                    description="The next ranked titles in this view."
                  />

                  <div className="space-y-3">
                    {boardEntries.map((series) => (
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
                        className="flex w-full items-center gap-4 border-[3px] border-black bg-white p-3 text-left shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#fff6c7] hover:shadow-none"
                        aria-label={`Open ${series.title}`}
                      >
                        <Cover
                          tone={series.coverTone}
                          coverUrl={series.coverUrl}
                          label={series.title}
                          eyebrow={
                            resolveSeriesCreatorName(series) || activeView.label
                          }
                          badge={getSeriesBadge(series)}
                          genres={series.genres}
                          seriesType={series.type}
                          className="aspect-[3/4] w-[4.5rem] flex-shrink-0 rounded-[16px]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-black uppercase tracking-[-0.02em] text-black">
                            {series.title}
                          </p>
                          <p className="mt-1 text-xs font-medium text-black/58">
                            {getSeriesMeta(series).join(" / ")}
                          </p>
                          {Array.isArray(series.genres) &&
                          series.genres.length > 0 ? (
                            <p className="mt-1 truncate text-xs font-medium text-black/46">
                              {series.genres.slice(0, 2).join(" / ")}
                            </p>
                          ) : null}
                        </div>
                        <span className="hidden border-[3px] border-black bg-[#00e5ff] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-black sm:inline-flex">
                          Open
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
                label="Creators"
                maxCreators={6}
                compact
                appearance="light"
                className="shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
              />

              <SurfacePanel
                className="space-y-4 border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
                appearance="light"
                accent="blue"
              >
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                    Browse
                  </p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-black">
                    Browse
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
