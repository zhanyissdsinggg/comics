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
    title: "See what readers are opening most right now.",
    description: "The biggest hits across the active catalog, all in one chart.",
  },
  {
    id: "new",
    label: "New",
    title: "Catch fresh releases before they blow up.",
    description: "New and recently updated series worth trying early.",
  },
  {
    id: "completed",
    label: "Completed",
    title: "Find finished stories you can binge now.",
    description: "Completed charts surface series you can read straight through.",
  },
  {
    id: "ttf",
    label: "Free Episodes",
    title: "Start with series that let you read before you pay.",
    description: "A cleaner way to find titles with a strong free starting point.",
  },
];

const WINDOWS = [
  { id: "all", label: "All time" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

const CHART_GUIDES = {
  popular: {
    audience: "Best if you want a proven hit first.",
    signal: "These are the series readers are opening most right now.",
    nextMove: "Start with the top title, then branch into search if you want something in the same lane.",
    searchHref: "/search?sort=popular",
    searchLabel: "Search popular series",
  },
  new: {
    audience: "Best if you want fresh launches and rising titles.",
    signal: "Use this chart to catch new series before they feel obvious.",
    nextMove: "Open the strongest launch, then compare it against the newest catalog results.",
    searchHref: "/search?sort=latest",
    searchLabel: "Browse latest releases",
  },
  completed: {
    audience: "Best if you want a full binge with no waiting.",
    signal: "Completed charts go straight to finished stories you can read straight through.",
    nextMove: "Start with the top completed title, then compare genre and length in search.",
    searchHref: "/search?status=Completed&sort=popular",
    searchLabel: "Browse completed series",
  },
  ttf: {
    audience: "Best if you want to sample a title before paying.",
    signal: "This chart highlights the strongest free-start options in the catalog.",
    nextMove: "Use the chart to start free, then compare points or membership only when you want more.",
    searchHref: "/search?sort=popular",
    searchLabel: "Browse free-start picks",
  },
};

function formatSeriesMeta(series) {
  const typeLabel = String(series.type || "Series");
  const statusLabel = String(series.status || "Ongoing");
  const rating = Number(series.rating);
  const ratingLabel = Number.isFinite(rating) ? rating.toFixed(1) : "N/A";
  return `${typeLabel} / ${statusLabel} / Rating ${ratingLabel}`;
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
        ? "border-white/20 bg-white text-neutral-950"
        : "border-white/10 bg-black/10 text-neutral-300 hover:border-white/20 hover:bg-white/10",
    ].join(" ");

  const spotlightEntries = list.slice(0, 8);
  const leadEntry = spotlightEntries[0] || null;
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
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Charts"
          title={activeTab.title}
          description={activeTab.description}
          secondary={`Browse the ${activeWindow.label.toLowerCase()} board, then switch windows without losing your place.`}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Search all series
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(tab === "completed" ? "/search?status=Completed&sort=popular" : "/search?sort=popular")
                }
                className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
              >
                {tab === "completed" ? "Browse completed" : "Browse catalog"}
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

        <SurfacePanel className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Chart controls
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                Choose a chart and time range.
              </h2>
            </div>
            <p className="text-xs text-neutral-500">
              {loading
                ? "Loading titles..."
                : `${list.length} titles / ${isAdultMode ? "18+ catalog enabled" : "Standard catalog enabled"}`}
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
          <SurfacePanel>
            <p className="text-sm text-neutral-400">Loading rankings...</p>
          </SurfacePanel>
        ) : list.length === 0 ? (
          <SurfacePanel className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Empty board
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                No ranked titles are available for this chart window.
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-400">
                Try another time range or go back to search to keep browsing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedWindow !== "all" ? (
                <button
                  type="button"
                  onClick={() => router.replace(`/rankings?type=${tab}&window=all`)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                >
                  Show all time
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => router.push("/search")}
                className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-400/15"
              >
                Search catalog
              </button>
            </div>
          </SurfacePanel>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <SurfacePanel className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                    Leaderboard
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                    {activeTab.label} chart / {activeWindow.label}
                  </h2>
                </div>
                <p className="text-xs text-neutral-500">{list.length} entries loaded</p>
              </div>

              {leadEntry ? (
                <button
                  type="button"
                  onClick={() => handleSeriesClick(leadEntry.id, "RANKINGS_LEAD")}
                  className="w-full rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <div className="grid gap-5 md:grid-cols-[140px_minmax(0,1fr)]">
                    <Cover tone={leadEntry.coverTone} coverUrl={leadEntry.coverUrl} className="h-52 rounded-[22px] md:h-full" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                            Rank #1 now
                          </p>
                          <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
                            {leadEntry.title}
                          </h3>
                        </div>
                        {leadEntry.badge ? <Pill>{leadEntry.badge}</Pill> : null}
                      </div>
                      <p className="mt-4 text-sm text-neutral-300">{formatSeriesMeta(leadEntry)}</p>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                        {chartGuide.signal}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {Array.isArray(leadEntry.genres) && leadEntry.genres.length > 0
                          ? leadEntry.genres.slice(0, 3).map((genre) => (
                              <span
                                key={genre}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300"
                              >
                                {genre}
                              </span>
                            ))
                          : null}
                      </div>
                    </div>
                  </div>
                </button>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((series, index) => (
                  <button
                    key={series.id}
                    type="button"
                    onClick={() => handleSeriesClick(series.id)}
                    className="rounded-[24px] border border-white/10 bg-black/10 p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                          Rank
                        </p>
                        <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
                          #{index + 1}
                        </p>
                      </div>
                      {series.badge ? <Pill>{series.badge}</Pill> : null}
                    </div>
                    <Cover tone={series.coverTone} coverUrl={series.coverUrl} className="mt-4 h-44" />
                    <div className="mt-4 space-y-2">
                      <p className="text-base font-semibold text-white">{series.title}</p>
                      <p className="text-xs text-neutral-400">{formatSeriesMeta(series)}</p>
                      {Array.isArray(series.genres) && series.genres.length > 0 ? (
                        <p className="text-xs text-neutral-500">{series.genres.slice(0, 3).join(" / ")}</p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </SurfacePanel>

            <div className="space-y-4">
              {leadEntry ? (
                <SurfacePanel className="space-y-4" tone="muted">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                        Start here
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                        Read the board winner first.
                      </h2>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-300">
                      {activeWindow.label}
                    </span>
                  </div>

                  <p className="text-sm leading-7 text-neutral-300">{chartGuide.nextMove}</p>
                  <p className="text-sm leading-6 text-neutral-400">{chartGuide.audience}</p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSeriesClick(leadEntry.id, "RANKINGS_START_HERE")}
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                    >
                      Read #1
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(chartGuide.searchHref)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      {chartGuide.searchLabel}
                    </button>
                    {leadEntry.genres?.[0] ? (
                      <button
                        type="button"
                        onClick={() => {
                          router.push(`/search?q=${encodeURIComponent(leadEntry.genres[0])}&sort=popular`);
                        }}
                        className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
                      >
                        Find similar
                      </button>
                    ) : null}
                  </div>

                  {leadCampaign ? (
                    <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                        {leadCampaign.eyebrow || "Keep going"}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-white">{leadCampaign.title}</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">
                        {leadCampaign.nextMove || chartGuide.nextMove}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(leadCampaign.discoveryHref)}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          {leadCampaign.discoveryCta}
                        </button>
                        <button
                          type="button"
                          onClick={openLeadValuePath}
                          className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-400/15"
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
                label="Chart creators"
                title="Follow the people behind the chart"
                description="If you like the top titles here, the creators behind them are a good next click."
                maxCreators={6}
                compact
                className="shadow-[0_26px_90px_rgba(0,0,0,0.24)]"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
