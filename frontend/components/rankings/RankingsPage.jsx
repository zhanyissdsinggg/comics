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
import Pill from "../common/Pill";
import { apiGet } from "../../lib/apiClient";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { getStorefrontCampaign } from "../../lib/storefrontCampaigns";
import { trackEvent } from "../../lib/trackEvent";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { getSearchParam } from "../../lib/pageSearchParams";

const TABS = [
  {
    id: "popular",
    label: "Popular",
    title: "See what readers are opening right now.",
    description: "The safest first click when you want something already pulling people in.",
  },
  {
    id: "new",
    label: "New",
    title: "Catch fresh releases before they go obvious.",
    description: "New launches and early risers that still feel a little ahead of the crowd.",
  },
  {
    id: "completed",
    label: "Completed",
    title: "Find finished stories you can binge now.",
    description: "Finished runs you can start tonight and keep reading straight through.",
  },
  {
    id: "ttf",
    label: "Free Episodes",
    title: "Start free before you unlock.",
    description: "The fastest way to find titles with a real first sample.",
  },
];

const WINDOWS = [
  { id: "all", label: "All time" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

const CHART_GUIDES = {
  popular: {
    audience: "Best when you just want the safest first click.",
    signal: "These are the titles readers are opening most right now.",
    nextMove: "Start with the top book, then branch into something nearby if the vibe feels right.",
    searchHref: "/search?sort=popular",
    searchLabel: "Open popular search",
  },
  new: {
    audience: "Best when you want something early, not something overexposed.",
    signal: "Use this Top Series view to catch rising books before they feel obvious.",
    nextMove: "Open the strongest launch, then see what else is still new.",
    searchHref: "/search?sort=latest",
    searchLabel: "See latest releases",
  },
  completed: {
    audience: "Best when you want payoff without waiting on updates.",
    signal: "This completed view goes straight to finished stories you can read straight through.",
    nextMove: "Start with the top finished title, then compare length and genre if you want another one.",
    searchHref: "/search?status=Completed&sort=popular",
    searchLabel: "See finished series",
  },
  ttf: {
    audience: "Best when you want to try the hook before you spend.",
    signal: "This free-start view highlights the titles with the strongest free entry right now.",
    nextMove: "Start free here, then decide later if the story is worth more of your time.",
    searchHref: "/search?sort=popular",
    searchLabel: "See more free starts",
  },
};

function formatSeriesMeta(series) {
  const typeLabel = String(series.type || "Series");
  const statusLabel = String(series.status || "Ongoing");
  const rating = Number(series.rating);
  const ratingLabel = Number.isFinite(rating) ? rating.toFixed(1) : "N/A";
  return `${typeLabel} / ${statusLabel} / Rating ${ratingLabel}`;
}

function RankingsLoadingState() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.32fr)_360px]">
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
  initialRankings = [],
  hasInitialRankings = false,
}) {
  const router = useRouter();
  const tab = getSearchParam(initialSearchParams, "type", "popular");
  const selectedWindow = getSearchParam(initialSearchParams, "window", "all");
  const [list, setList] = useState(Array.isArray(initialRankings) ? initialRankings : []);
  const [loading, setLoading] = useState(!hasInitialRankings);
  const [commerceNotice, setCommerceNotice] = useState(null);
  const { isAdultMode } = useAdultGateStore();

  const activeTab = TABS.find((item) => item.id === tab) || TABS[0];
  const activeWindow = WINDOWS.find((item) => item.id === selectedWindow) || WINDOWS[0];
  const chartGuide = CHART_GUIDES[tab] || CHART_GUIDES.popular;
  const rankingsPath = `/rankings?type=${tab}&window=${selectedWindow}`;

  const handleSeriesClick = useCallback(
    (seriesId, entryPoint = "RANKINGS_BOARD", campaignId = `${tab}_${selectedWindow}`) => {
      const targetPath = `/series/${seriesId}`;
      trackEvent("ranking_click", {
        seriesId,
        entryPoint,
        chartType: tab,
        window: selectedWindow,
        campaignId,
      });
      router.push(
        buildPathWithAttribution(targetPath, {
          entryPoint,
          campaignId,
          sourcePath: rankingsPath,
          sourceSeriesId: seriesId,
          returnTo: targetPath,
        }),
      );
    },
    [rankingsPath, router, selectedWindow, tab],
  );
  const handleSeriesLinkClick = useCallback(
    (event, seriesId, entryPoint = "RANKINGS_BOARD", campaignId = `${tab}_${selectedWindow}`) => {
      if (isModifiedEvent(event)) {
        return;
      }

      event.preventDefault();
      handleSeriesClick(seriesId, entryPoint, campaignId);
    },
    [handleSeriesClick, selectedWindow, tab],
  );

  useEffect(() => {
    if (!hasInitialRankings) {
      setLoading(true);
    }
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/rankings?type=${tab}&window=${selectedWindow}&adult=${adultFlag}`).then((response) => {
      if (response.ok) {
        setList(response.data?.rankings || []);
      } else {
        setList([]);
      }
      setLoading(false);
    });
  }, [hasInitialRankings, isAdultMode, selectedWindow, tab]);

  useEffect(() => {
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/rankings")));
  }, []);

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

  const spotlightEntries = list.slice(0, 8);
  const leadEntry = spotlightEntries[0] || null;
  const supportingEntries = list.slice(1, 3);
  const boardEntries = list.slice(3, 12);
  const leadCampaign = useMemo(() => getStorefrontCampaign(leadEntry), [leadEntry]);

  const openLeadValuePath = useCallback(() => {
    if (!leadEntry || !leadCampaign) {
      return;
    }

    const attribution = {
      entryPoint: "RANKINGS_CAMPAIGN",
      campaignId: leadCampaign.id,
      sourcePath: rankingsPath,
      sourceSeriesId: leadEntry.id,
      returnTo: `/series/${leadEntry.id}`,
    };

    if (leadCampaign.valueKind === "store") {
      router.push(buildPathWithAttribution("/store", attribution, { focus: "auto" }));
      return;
    }

    router.push(buildPathWithAttribution("/subscribe", attribution));
  }, [leadCampaign, leadEntry, rankingsPath, router]);

  return (
    <main className="gush-page-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="light" />
      <div className="gush-page-main gush-section-stack">
        <EditorialHero
          eyebrow="Top Series"
          title={activeTab.title}
          description={activeTab.description}
          secondary={`${activeWindow.label} view.`}
          appearance="light"
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className={primaryButtonClass}
              >
                Search titles
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(tab === "completed" ? "/search?status=Completed&sort=popular" : "/search?sort=popular")
                }
                className="rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
              >
                {tab === "completed" ? "See finished reads" : "Open search"}
              </button>
            </>
          }
        />

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Views
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Choose the shelf.
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {loading
                ? "Refreshing this board..."
                : `${list.length} titles / ${isAdultMode ? "18+ on" : "standard view"}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.replace(`/rankings?type=${item.id}&window=${selectedWindow}`)}
                className={filterButtonClass(tab === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {WINDOWS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.replace(`/rankings?type=${tab}&window=${item.id}`)}
                className={filterButtonClass(selectedWindow === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </SurfacePanel>

        {loading ? (
          <RankingsLoadingState />
        ) : list.length === 0 ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.32fr)_360px]">
            <div className="grid gap-4 md:grid-cols-2">
              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Rank #1
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Use this slot as your safest first click.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{chartGuide.signal}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    router.push(tab === "completed" ? "/search?status=Completed&sort=popular" : chartGuide.searchHref)
                  }
                  className={primaryButtonClass}
                >
                  {chartGuide.searchLabel}
                </button>
              </SurfacePanel>

              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Rank #2
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Compare it against another board mood.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Switch between Popular, New, Completed, and Free Episodes when this one feels too quiet.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedWindow !== "all" ? (
                    <button
                      type="button"
                      onClick={() => router.replace(`/rankings?type=${tab}&window=all`)}
                      className={secondaryButtonClass}
                    >
                      Show all time
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => router.replace(`/rankings?type=popular&window=week`)}
                    className={secondaryButtonClass}
                  >
                    Open Popular
                  </button>
                </div>
              </SurfacePanel>

              <SurfacePanel className="space-y-4 md:col-span-2" appearance="light" accent="blue">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Rank #3
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                      Keep the browse moving even without a live board.
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/search")}
                    className={secondaryButtonClass}
                  >
                    Search titles
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    {
                      title: "Popular",
                      body: "Best when you just want the safest first click.",
                      href: "/rankings?type=popular&window=week",
                    },
                    {
                      title: "Completed",
                      body: "Best when you want a finished story instead of waiting on updates.",
                      href: "/rankings?type=completed&window=all",
                    },
                    {
                      title: "Free Episodes",
                      body: "Best when you want to try a hook before you spend points.",
                      href: "/rankings?type=ttf&window=all",
                    },
                  ].map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className="rounded-[22px] border border-black/6 bg-white/86 p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-black/10"
                    >
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                    </button>
                  ))}
                </div>
              </SurfacePanel>
            </div>

            <div className="space-y-4">
              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Top Series creators
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Follow the people behind the books that stick.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    When creator pages are visible, they are the cleanest next step after a strong ranking pick.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/creators")}
                    className={primaryButtonClass}
                  >
                    Browse creators
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/comics")}
                    className={secondaryButtonClass}
                  >
                    Browse comics
                  </button>
                </div>
              </SurfacePanel>

              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Better fallback
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Use search when this board is empty.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Search, Top Series, and creator pages work together. If one route is thin, the others should still keep the visit moving.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className={secondaryButtonClass}
                >
                  Search everything
                </button>
              </SurfacePanel>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.32fr)_360px]">
            <div className="space-y-6">
              {leadEntry ? (
                <Link
                  href={`/series/${encodeURIComponent(leadEntry.id)}`}
                  onClick={(event) => handleSeriesLinkClick(event, leadEntry.id, "RANKINGS_LEAD")}
                  className="w-full rounded-[32px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] p-5 text-left shadow-[0_22px_52px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-black/10"
                  aria-label={`Open ${leadEntry.title}`}
                >
                  <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
                    <Cover
                      tone={leadEntry.coverTone}
                      coverUrl={leadEntry.coverUrl}
                      label={leadEntry.title}
                      eyebrow={activeTab.label}
                      badge={leadEntry.badge}
                      genres={leadEntry.genres}
                      seriesType={leadEntry.type}
                      className="mx-auto aspect-[3/4] w-full max-w-[220px] rounded-[24px] lg:mx-0"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Rank #1
                          </p>
                          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                            {leadEntry.title}
                          </h2>
                        </div>
                        {leadEntry.badge ? <Pill appearance="light">{leadEntry.badge}</Pill> : null}
                      </div>

                      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{chartGuide.signal}</p>
                      <p className="mt-3 text-sm text-slate-500">{formatSeriesMeta(leadEntry)}</p>

                      {Array.isArray(leadEntry.genres) && leadEntry.genres.length > 0 ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {leadEntry.genres.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="rounded-full border border-black/8 bg-white/84 px-3 py-1 text-xs text-slate-600"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--gush-accent,#2f6bff)]">
                          {activeWindow.label}
                        </span>
                        <span className="rounded-full border border-black/8 bg-white/84 px-3 py-1.5 text-xs font-semibold text-slate-500">
                          {activeTab.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : null}

              {supportingEntries.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {supportingEntries.map((series, index) => (
                    <Link
                      key={series.id}
                      href={`/series/${encodeURIComponent(series.id)}`}
                      onClick={(event) => handleSeriesLinkClick(event, series.id, "RANKINGS_SUPPORTING")}
                      className="rounded-[26px] border border-black/6 bg-white/88 p-4 text-left shadow-[0_14px_32px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-black/10"
                      aria-label={`Open ${series.title}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Rank #{index + 2}
                          </p>
                          <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                            {series.title}
                          </h3>
                        </div>
                        {series.badge ? <Pill appearance="light">{series.badge}</Pill> : null}
                      </div>
                      <Cover
                        tone={series.coverTone}
                        coverUrl={series.coverUrl}
                        label={series.title}
                        eyebrow={`Rank #${index + 2}`}
                        badge={series.badge}
                        genres={series.genres}
                        seriesType={series.type}
                        className="mt-4 aspect-[3/4] w-full rounded-[20px]"
                      />
                      <p className="mt-4 text-sm text-slate-500">{formatSeriesMeta(series)}</p>
                    </Link>
                  ))}
                </div>
              ) : null}

              {boardEntries.length > 0 ? (
                <SurfacePanel className="space-y-5" appearance="light" accent="blue">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Keep going
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                        Continue through Top Series.
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500">
                      {list.length} ranked title{list.length === 1 ? "" : "s"} in this view
                    </p>
                  </div>

                  <div className="space-y-3">
                    {boardEntries.map((series, index) => (
                      <Link
                        key={series.id}
                        href={`/series/${encodeURIComponent(series.id)}`}
                        onClick={(event) => handleSeriesLinkClick(event, series.id, "RANKINGS_BOARD_LIST")}
                        className="flex w-full items-center gap-4 rounded-[24px] border border-black/6 bg-white/86 p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-black/10"
                        aria-label={`Open ${series.title}`}
                      >
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] border border-black/8 bg-[#f8f9fc]">
                          <span className="font-display text-xl font-semibold tracking-tight text-slate-950">
                            #{index + 4}
                          </span>
                        </div>
                        <Cover
                          tone={series.coverTone}
                          coverUrl={series.coverUrl}
                          label={series.title}
                          eyebrow={`Rank #${index + 4}`}
                          badge={series.badge}
                          genres={series.genres}
                          seriesType={series.type}
                          className="aspect-[3/4] w-[4.5rem] flex-shrink-0 rounded-[16px]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-slate-950">{series.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatSeriesMeta(series)}</p>
                          {Array.isArray(series.genres) && series.genres.length > 0 ? (
                            <p className="mt-1 truncate text-xs text-slate-400">{series.genres.slice(0, 2).join(" / ")}</p>
                          ) : null}
                        </div>
                        <span className="hidden rounded-full border border-black/8 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 sm:inline-flex">
                          Open
                        </span>
                      </Link>
                    ))}
                  </div>
                </SurfacePanel>
              ) : null}
            </div>

            <div className="space-y-4">
              {leadEntry ? (
                <SurfacePanel className="space-y-4" tone="muted" appearance="light" accent="blue">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Start here
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                        Read the lead pick first.
                      </h2>
                    </div>
                    <span className="rounded-full border border-black/8 bg-white/84 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {activeWindow.label}
                    </span>
                  </div>

                  <p className="text-sm leading-7 text-slate-600">{chartGuide.nextMove}</p>
                  <p className="text-sm leading-6 text-slate-500">{chartGuide.audience}</p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSeriesClick(leadEntry.id, "RANKINGS_START_HERE")}
                      className={primaryButtonClass}
                    >
                      Read #1
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(chartGuide.searchHref)}
                      className={secondaryButtonClass}
                    >
                      {chartGuide.searchLabel}
                    </button>
                    {leadEntry.genres?.[0] ? (
                      <button
                        type="button"
                        onClick={() => {
                          router.push(`/search?q=${encodeURIComponent(leadEntry.genres[0])}&sort=popular`);
                        }}
                        className={secondaryButtonClass}
                      >
                        Browse {leadEntry.genres[0]}
                      </button>
                    ) : null}
                  </div>

                  {leadCampaign ? (
                    <div className="rounded-[24px] border border-black/6 bg-white/84 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        {leadCampaign.eyebrow || "Keep going"}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-slate-950">{leadCampaign.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {leadCampaign.nextMove || chartGuide.nextMove}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(leadCampaign.discoveryHref)}
                          className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                        >
                          {leadCampaign.discoveryCta}
                        </button>
                        <button
                          type="button"
                          onClick={openLeadValuePath}
                          className="rounded-full border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.08)]"
                        >
                          {leadCampaign.valueCta}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </SurfacePanel>
              ) : null}

              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Board note
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Use this shelf for faster first clicks.
                  </h2>
                </div>
                <p className="text-sm leading-7 text-slate-600">{chartGuide.signal}</p>
              </SurfacePanel>

              <CreatorShelfLinks
                items={spotlightEntries}
                entryPoint="RANKINGS_CREATOR_CHIP"
                campaignId={`${tab}_${selectedWindow}_spotlight_creator`}
                sourcePath={rankingsPath}
                label="Top Series creators"
                title="Try the creators behind these picks"
                description="If one title lands, open the same creator next."
                maxCreators={6}
                compact
                appearance="light"
                className="shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
