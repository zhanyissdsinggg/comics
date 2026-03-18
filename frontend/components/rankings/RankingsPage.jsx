"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    title: "Start with series that let you read before you pay.",
    description: "The easiest way to find titles that give you a real first sample.",
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

export default function RankingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("type") || "popular";
  const selectedWindow = searchParams.get("window") || "all";
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    setLoading(true);
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/rankings?type=${tab}&window=${selectedWindow}&adult=${adultFlag}`).then((response) => {
      if (response.ok) {
        setList(response.data?.rankings || []);
      } else {
        setList([]);
      }
      setLoading(false);
    });
  }, [isAdultMode, selectedWindow, tab]);

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
    <main className="relative min-h-screen overflow-hidden bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <div className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Top Series"
          title={activeTab.title}
          description={activeTab.description}
          secondary={`${activeWindow.label} view. Move between windows and keep the same reading mood.`}
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
                Pick the board
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Choose a Top Series view.
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
          <SurfacePanel className="space-y-4" appearance="light" accent="blue">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Quiet board
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                This Top Series view is quiet right now.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Try another time window, open Top Series, or head back to search for a broader browse.
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
                onClick={() => router.push("/search")}
                className={primaryButtonClass}
              >
                Search titles
              </button>
            </div>
          </SurfacePanel>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.32fr)_360px]">
            <div className="space-y-6">
              {leadEntry ? (
                <button
                  type="button"
                  onClick={() => handleSeriesClick(leadEntry.id, "RANKINGS_LEAD")}
                  className="w-full rounded-[32px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] p-5 text-left shadow-[0_22px_52px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-black/10"
                >
                  <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
                    <Cover tone={leadEntry.coverTone} coverUrl={leadEntry.coverUrl} className="h-64 rounded-[24px] lg:h-full" />
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
                </button>
              ) : null}

              {supportingEntries.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {supportingEntries.map((series, index) => (
                    <button
                      key={series.id}
                      type="button"
                      onClick={() => handleSeriesClick(series.id, "RANKINGS_SUPPORTING")}
                      className="rounded-[26px] border border-black/6 bg-white/88 p-4 text-left shadow-[0_14px_32px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-black/10"
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
                      <Cover tone={series.coverTone} coverUrl={series.coverUrl} className="mt-4 h-48 rounded-[20px]" />
                      <p className="mt-4 text-sm text-slate-500">{formatSeriesMeta(series)}</p>
                    </button>
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
                      <button
                        key={series.id}
                        type="button"
                        onClick={() => handleSeriesClick(series.id, "RANKINGS_BOARD_LIST")}
                        className="flex w-full items-center gap-4 rounded-[24px] border border-black/6 bg-white/86 p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-black/10"
                      >
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] border border-black/8 bg-[#f8f9fc]">
                          <span className="font-display text-xl font-semibold tracking-tight text-slate-950">
                            #{index + 4}
                          </span>
                        </div>
                        <Cover tone={series.coverTone} coverUrl={series.coverUrl} className="h-20 w-16 flex-shrink-0 rounded-[16px]" />
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
                      </button>
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
                    What this board is good at
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Use Top Series like an editor&apos;s shelf.
                  </h2>
                </div>
                <p className="text-sm leading-7 text-slate-600">{chartGuide.signal}</p>
                <p className="text-sm leading-6 text-slate-500">
                  Move from the lead pick to the next two, then keep going if the mood still feels right.
                </p>
              </SurfacePanel>

              <CreatorShelfLinks
                items={spotlightEntries}
                entryPoint="RANKINGS_CREATOR_CHIP"
                campaignId={`${tab}_${selectedWindow}_spotlight_creator`}
                sourcePath={rankingsPath}
                label="Top Series creators"
                title="Try the creators behind these picks"
                description="If one of these titles lands, the same creator pages are the next smart click."
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
