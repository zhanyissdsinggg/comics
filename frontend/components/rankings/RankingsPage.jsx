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
    description: "A live view of the titles drawing the most attention.",
  },
  {
    id: "new",
    label: "New",
    title: "Catch fresh releases early.",
    description: "New launches and rising titles still gathering momentum.",
  },
  {
    id: "completed",
    label: "Completed",
    title: "Find finished stories you can read straight through.",
    description: "Finished runs ready for a full reading session.",
  },
  {
    id: "ttf",
    label: "Start Free",
    title: "Try the opening chapters first.",
    description: "Sample the opening before you unlock more.",
  },
];

const WINDOWS = [
  { id: "all", label: "All time" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

const CHART_GUIDES = {
  popular: {
    audience: "For the titles carrying the strongest momentum.",
    signal: "These titles are drawing the most attention right now.",
    nextMove: "Start with the lead title, then branch into nearby moods or creators.",
    searchHref: "/search?sort=popular",
    searchLabel: "Browse related titles",
  },
  new: {
    audience: "For readers who want something earlier in its run.",
    signal: "A clean way to catch rising releases before they feel obvious.",
    nextMove: "Open the strongest launch, then stay with the newest shelf.",
    searchHref: "/search?sort=latest",
    searchLabel: "See latest releases",
  },
  completed: {
    audience: "For readers who want payoff without waiting on updates.",
    signal: "Finished stories ready to read straight through.",
    nextMove: "Open the lead finished title, then compare another completed pick.",
    searchHref: "/search?status=Completed&sort=popular",
    searchLabel: "See finished series",
  },
  ttf: {
    audience: "For readers who want a lighter first step.",
    signal: "A shelf built around strong openings and free starts.",
    nextMove: "Try the opener here, then decide where you want to keep going.",
    searchHref: "/search?sort=popular",
    searchLabel: "See more to try",
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
                {tab === "completed" ? "See finished reads" : "Browse catalog"}
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

        <div className="rounded-[24px] border border-black/6 bg-white/82 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
          </div>
        </div>

        {loading ? (
          <RankingsLoadingState />
        ) : list.length === 0 ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.32fr)_360px]">
            <div className="space-y-4">
              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Top Series
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    This board is quiet right now.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{chartGuide.signal}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(tab === "completed" ? "/search?status=Completed&sort=popular" : chartGuide.searchHref)
                    }
                    className={primaryButtonClass}
                  >
                    {chartGuide.searchLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/search")}
                    className={secondaryButtonClass}
                  >
                    Search titles
                  </button>
                </div>
              </SurfacePanel>

              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Other views
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Try another chart.
                  </h2>
                </div>
                <div className="grid gap-3">
                  {[
                    {
                      title: "Popular",
                      href: "/rankings?type=popular&window=week",
                    },
                    {
                      title: "Completed",
                      href: "/rankings?type=completed&window=all",
                    },
                    {
                      title: "Start Free",
                      href: "/rankings?type=ttf&window=all",
                    },
                  ].map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className="rounded-[20px] border border-black/6 bg-white/88 px-4 py-4 text-left text-sm font-semibold text-slate-900 transition hover:border-black/10 hover:bg-[#f8f9fc]"
                    >
                      {item.title}
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
                    Follow the people behind these books.
                  </h2>
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
                    Search
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Search the full catalog.
                  </h2>
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Rank #1
                      </p>
                      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                        {leadEntry.title}
                      </h2>

                      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{chartGuide.signal}</p>
                      <p className="mt-3 text-sm text-slate-500">{formatSeriesMeta(leadEntry)}</p>
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
                  <div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        More from this board
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                        Keep reading through the chart.
                      </h2>
                    </div>
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
                  <div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Reading path
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                        Keep going from the lead title.
                      </h2>
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-slate-600">{chartGuide.nextMove}</p>

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

              <CreatorShelfLinks
                items={spotlightEntries}
                entryPoint="RANKINGS_CREATOR_CHIP"
                campaignId={`${tab}_${selectedWindow}_spotlight_creator`}
                sourcePath={rankingsPath}
                label="Top Series creators"
                title="Creators behind these picks"
                description="Open the same voice again if one title lands."
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
