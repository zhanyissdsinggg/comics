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
    description: "",
  },
  {
    id: "start-here",
    label: "Start Here",
    description: "",
  },
  {
    id: "completed",
    label: "Completed",
    description: "",
  },
  {
    id: "comics",
    label: "Comics",
    description: "",
  },
  {
    id: "novels",
    label: "Novels",
    description: "",
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
                className="rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.07)]"
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
              className="h-20 rounded-[22px] border border-black/10 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
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
          <span className="rounded-full border border-black/10 bg-[#f6f7f9] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/72 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
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
      hint: loading ? "Updating." : "In this view.",
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
    "rounded-full border border-black bg-black px-4 py-2 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-all hover:bg-black/90";
  const secondaryButtonClass =
    "rounded-full border border-black/12 bg-white px-4 py-2 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all hover:border-black/18 hover:bg-black/[0.03]";
  const heroTitle =
    activeView.id === "featured" ? "Featured stories." : `${activeView.label}.`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
      <SiteHeader variant="home" />
      <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-4 py-6 md:gap-8 md:px-8 md:py-10">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
          <EditorialHero
            eyebrow="Editor's shelf"
            title={heroTitle}
            description={activeView.description}
            secondary=""
            stats={heroStats}
            className="min-h-full"
            appearance="light"
            accent="blue"
          />

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-5 border border-black/10 bg-white p-4 text-black shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-5"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
                Ranking desk
              </p>
              <div>
                <h2 className="text-[1.9rem] font-black uppercase leading-[0.94] tracking-[-0.05em] text-black">
                  {activeView.label}
                </h2>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 text-black shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/55">
                  Shelf
                </p>
                <p className="mt-2 text-[1.35rem] font-black uppercase tracking-[-0.04em]">
                  {activeView.label}
                </p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-white px-4 py-3 text-black shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/55">
                  Titles
                </p>
                <p className="mt-2 text-[1.35rem] font-black uppercase tracking-[-0.04em]">
                  {loading ? "..." : curatedSeries.length.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                Next
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => router.push("/comics")}
                  className={primaryButtonClass}
                >
                  Comics
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/creators")}
                  className={secondaryButtonClass}
                >
                  Creators
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
          className="space-y-4 border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
        >
          <RankingsSectionHeader
            eyebrow="Views"
            title="Switch shelves"
            description=""
          />
          <div className="flex flex-wrap gap-2.5">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.replace(`/rankings?view=${item.id}`)}
                className={[
                  "rounded-full border px-4 py-2.5 text-sm font-semibold tracking-[0.02em] transition-all",
                  activeView.id === item.id
                    ? "border-black bg-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
                    : "border-black/12 bg-white text-black/62 shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:border-black/18 hover:bg-black/[0.03] hover:text-black",
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
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.28fr)_360px]">
            <SurfacePanel
              className="space-y-4"
              appearance="light"
              accent="blue"
            >
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                  Shelf
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-black">
                  No titles yet.
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
              </div>
              <button
                type="button"
                onClick={() => router.push("/creators")}
                className={secondaryButtonClass}
              >
                Creators
              </button>
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
                  className="group w-full rounded-[30px] border border-black/10 bg-white p-3.5 text-left text-black shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition-all hover:border-black/15 hover:bg-black/[0.02] sm:p-5"
                  aria-label={`Open ${leadEntry.title}`}
                >
                    <div className="grid gap-3.5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-5">
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
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
                        Lead pick
                      </p>
                      <h2 className="mt-2.5 text-[1.65rem] font-black uppercase tracking-[-0.05em] text-black sm:mt-3 sm:text-4xl">
                        {leadEntry.title}
                      </h2>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        {getSeriesMeta(leadEntry).map((item) => (
                          <span
                            key={`${leadEntry.id}-lead-meta-${item}`}
                            className="rounded-full border border-black/10 bg-[#f6f7fb] px-3 py-1.5 font-semibold tracking-[0.04em] text-black"
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
                <div className="grid gap-3 md:grid-cols-2 md:gap-4">
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
                        className="group rounded-[28px] border border-black/10 bg-white p-3 text-left shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition-all hover:border-black/15 hover:bg-black/[0.02] sm:p-4"
                      aria-label={`Open ${series.title}`}
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                        {activeView.label}
                      </p>
                      <h3 className="mt-2 text-[1.35rem] font-black uppercase tracking-[-0.05em] text-black sm:text-2xl">
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
                            className="rounded-full border border-black/10 bg-[#f6f7fb] px-3 py-1.5 font-semibold tracking-[0.04em] text-black/70"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-black/55">
                        Series
                      </p>
                    </Link>
                  ))}
                </div>
              ) : null}

              {boardEntries.length > 0 ? (
                  <section className="space-y-4 rounded-[30px] border border-black/10 bg-white p-3.5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:space-y-5 sm:p-6">
                  <RankingsSectionHeader eyebrow="More titles" title="More" description="" />

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
                        className="flex w-full items-center gap-4 rounded-[24px] border border-black/10 bg-white p-3 text-left shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition-all hover:border-black/15 hover:bg-black/[0.02]"
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
                        <span className="hidden rounded-full border border-black/10 bg-[#f6f7fb] px-3 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-black sm:inline-flex">
                          Series
                        </span>
                      </Link>
                    ))}
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
                appearance="light"
                className="shadow-[0_22px_48px_rgba(15,23,42,0.08)]"
              />

              <SurfacePanel
                className="space-y-4 border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
                appearance="light"
                accent="blue"
              >
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
                    Paths
                  </p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-black">
                    Paths
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
