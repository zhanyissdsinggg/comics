"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import StorefrontEventHub from "../common/StorefrontEventHub";
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
    title: "Watch the hottest titles move without digging through stale shelves.",
    description: "This chart tracks the series pulling the most momentum across the active storefront.",
    hint: "High-engagement titles rising fastest right now.",
  },
  {
    id: "new",
    label: "New",
    title: "Catch fresh launches before the rest of the shelf catches up.",
    description: "Use the new chart to spot recent releases, returning titles, and early-breakout series.",
    hint: "Recent arrivals worth checking before they flatten out.",
  },
  {
    id: "completed",
    label: "Completed",
    title: "Find finished series built for long-session binge reading.",
    description: "Completed charts help readers move straight into stories that are already fully available.",
    hint: "Finished runs that convert well for binge readers.",
  },
  {
    id: "ttf",
    label: "Free Unlocks",
    title: "See where free-unlock momentum is strongest across the storefront.",
    description: "These charts surface titles with active free unlock value, so readers can keep moving without an immediate top up.",
    hint: "Free unlock lanes worth checking before you spend points.",
  },
];

const WINDOWS = [
  { id: "all", label: "All time" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

const CHART_GUIDES = {
  popular: {
    audience: "Readers who want social proof before they commit time or points.",
    signal: "This board surfaces the strongest engagement gravity across the active storefront.",
    nextMove: "Open the top title first, then widen into search if you want adjacent series instead of one winner.",
    searchHref: "/search?sort=popular",
    searchLabel: "Search popular catalog",
  },
  new: {
    audience: "Readers looking for fresh launches, returners, and early-breakout releases.",
    signal: "Use this chart to catch momentum before the shelf settles and the breakout story becomes obvious.",
    nextMove: "Compare the top launch against search results sorted by latest so discovery stays current.",
    searchHref: "/search?sort=latest",
    searchLabel: "Browse latest releases",
  },
  completed: {
    audience: "Readers who want long-session immersion and zero waiting between chapters.",
    signal: "Completed charts cut straight to finished runs that are already ready for binge behavior.",
    nextMove: "Open the top pick, then use completed search to compare depth, genre, and payoff.",
    searchHref: "/search?status=Completed&sort=popular",
    searchLabel: "Browse completed catalog",
  },
  ttf: {
    audience: "Readers who want to keep moving through chapters before topping up.",
    signal: "This board highlights where free-unlock value is strongest right now.",
    nextMove: "Use the chart for momentum, then hand off to membership or store surfaces before the session hits friction.",
    searchHref: "/search?sort=popular",
    searchLabel: "Search free-start titles",
  },
};

function formatSeriesMeta(series) {
  const typeLabel = String(series.type || "Series");
  const statusLabel = String(series.status || "Ongoing");
  const rating = Number(series.rating);
  const ratingLabel = Number.isFinite(rating) ? rating.toFixed(1) : "N/A";
  return `${typeLabel} | ${statusLabel} | Rating ${ratingLabel}`;
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

  const rankingStats = useMemo(
    () => [
      {
        label: "Chart",
        value: activeTab.label,
        hint: activeTab.hint,
      },
      {
        label: "Window",
        value: activeWindow.label,
        hint: "Time range applied to the visible leaderboard.",
      },
      {
        label: "Titles",
        value: loading ? "..." : list.length.toLocaleString(),
        hint: "Series loaded into the current board.",
      },
      {
        label: "Mode",
        value: isAdultMode ? "18+" : "Standard",
        hint: isAdultMode ? "Protected catalog slice is eligible here." : "Age-gated titles are excluded.",
      },
    ],
    [activeTab.hint, activeTab.label, activeWindow.label, isAdultMode, list.length, loading],
  );

  const filterButtonClass = (isActive) =>
    [
      "rounded-full border px-4 py-2 text-xs font-semibold transition",
      isActive
        ? "border-white/20 bg-white text-neutral-950"
        : "border-white/10 bg-black/10 text-neutral-300 hover:border-white/20 hover:bg-white/10",
    ].join(" ");

  const spotlightEntries = list.slice(0, 3);
  const leadEntry = spotlightEntries[0] || null;
  const supportEntries = spotlightEntries.slice(1);
  const leadCampaign = useMemo(() => getStorefrontCampaign(leadEntry), [leadEntry]);
  const rankingEventCards = useMemo(() => {
    if (!leadEntry?.id) {
      return [];
    }

    const valueKind = leadCampaign?.valueKind || (tab === "ttf" ? "subscribe" : "store");
    const valueCta =
      leadCampaign?.valueCta || (valueKind === "store" ? "Open point packs" : "Compare membership");
    const valueAttribution = {
      entryPoint: "RANKINGS_EVENT_HUB",
      campaignId: leadCampaign?.id || `${tab}_${selectedWindow}_value`,
      sourcePath: rankingsPath,
      sourceSeriesId: leadEntry.id,
      returnTo: `/series/${leadEntry.id}`,
    };

    return [
      {
        id: "board-winner",
        eyebrow: "Board winner",
        title: `${leadEntry.title} owns the ${activeWindow.label.toLowerCase()} ${activeTab.label.toLowerCase()} board.`,
        description:
          "The chart winner should feel like a live event with social proof, not just row one in a static leaderboard.",
        signalLabel: "Rank",
        signalValue: "#1",
        signalHint: `${activeTab.label} · ${activeWindow.label}`,
        ctaLabel: "Open rank #1",
        onClick: () =>
          handleSeriesClick(leadEntry.id, "RANKINGS_EVENT_HUB", `winner_${tab}_${selectedWindow}`),
        accentClass:
          "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "search-handoff",
        eyebrow: "Compare next",
        title: "Widen the signal in search before the board goes stale.",
        description: chartGuide.nextMove,
        signalLabel: "Desk",
        signalValue: activeTab.label,
        signalHint: chartGuide.searchLabel,
        ctaLabel: chartGuide.searchLabel,
        onClick: () => router.push(chartGuide.searchHref),
        accentClass:
          "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "value-path",
        eyebrow: leadCampaign?.eyebrow || "Value path",
        title:
          leadCampaign?.title ||
          (tab === "ttf"
            ? "Free-start momentum still needs a clean membership handoff."
            : "Hot chart traffic still needs a clear spend path."),
        description:
          leadCampaign?.value ||
          (tab === "ttf"
            ? "When free chapters slow down, the membership route should already be visible."
            : "Readers hitting high-intent chart titles should not have to hunt for wallet or membership value."),
        signalLabel: "Offer fit",
        signalValue: valueKind === "store" ? "Wallet" : "Member",
        signalHint: valueCta,
        ctaLabel: valueCta,
        onClick: () => {
          if (valueKind === "store") {
            router.push(buildPathWithAttribution("/store", valueAttribution, { focus: "auto" }));
            return;
          }

          router.push(buildPathWithAttribution("/subscribe", valueAttribution));
        },
        accentClass:
          valueKind === "store"
            ? "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]"
            : "group border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
      },
    ];
  }, [
    activeTab.label,
    activeWindow.label,
    chartGuide.nextMove,
    chartGuide.searchHref,
    chartGuide.searchLabel,
    handleSeriesClick,
    leadCampaign,
    leadEntry,
    rankingsPath,
    router,
    selectedWindow,
    tab,
  ]);

  return (
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Ranking desk"
          title={activeTab.title}
          description={activeTab.description}
          secondary={`Switch between ${activeWindow.label.toLowerCase()} and other windows without losing your place in the board.`}
          stats={rankingStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Search titles
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
                Move from leaderboard to series page in one clean pass.
              </h2>
            </div>
            <p className="text-xs text-neutral-500">
              {isAdultMode ? "18+ catalog enabled" : "Standard catalog enabled"}
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
                Reset the time range or move back into search so the session does not end on a dead board.
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
          <>
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <SurfacePanel className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                      Top 3 spotlight
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                      The first click off this board should feel editorial, not random.
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-500">{activeTab.label} desk</p>
                </div>

                {leadEntry ? (
                  <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 text-left">
                    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                      <Cover tone={leadEntry.coverTone} coverUrl={leadEntry.coverUrl} className="h-72 rounded-[24px]" />
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                              Rank #1
                            </p>
                            <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
                              {leadEntry.title}
                            </h3>
                          </div>
                          {leadEntry.badge ? <Pill>{leadEntry.badge}</Pill> : null}
                        </div>
                        <p className="mt-4 text-sm text-neutral-300">{formatSeriesMeta(leadEntry)}</p>
                        <p className="mt-3 text-sm leading-7 text-neutral-400">
                          {chartGuide.signal}
                        </p>
                        {leadCampaign ? (
                          <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                                {leadCampaign.eyebrow}
                              </p>
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-300">
                                Campaign fit
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-white">{leadCampaign.title}</p>
                            <p className="mt-2 text-sm leading-6 text-neutral-400">{leadCampaign.nextMove}</p>
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
                                onClick={() => {
                                  const attribution = {
                                    entryPoint: "RANKINGS_CAMPAIGN",
                                    campaignId: leadCampaign.id,
                                    sourcePath: rankingsPath,
                                    sourceSeriesId: leadEntry.id,
                                    returnTo: `/series/${leadEntry.id}`,
                                  };

                                  if (leadCampaign.valueKind === "store") {
                                    router.push(
                                      buildPathWithAttribution("/store", attribution, {
                                        focus: "auto",
                                      }),
                                    );
                                    return;
                                  }

                                  router.push(buildPathWithAttribution("/subscribe", attribution));
                                }}
                                className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-400/15"
                              >
                                {leadCampaign.valueCta}
                              </button>
                            </div>
                          </div>
                        ) : null}
                        {Array.isArray(leadEntry.genres) && leadEntry.genres.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {leadEntry.genres.slice(0, 3).map((genre) => (
                              <span
                                key={genre}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-5 flex flex-wrap gap-2">
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                            {activeWindow.label}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-neutral-300">
                            {chartGuide.audience}
                          </span>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSeriesClick(leadEntry.id)}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                          >
                            Open series
                          </button>
                          {leadEntry.genres?.[0] ? (
                            <button
                              type="button"
                              onClick={() => {
                                router.push(`/search?q=${encodeURIComponent(leadEntry.genres[0])}&sort=popular`);
                              }}
                              className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
                            >
                              Search similar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {supportEntries.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {supportEntries.map((series, index) => (
                      <button
                        key={series.id}
                        type="button"
                        onClick={() => handleSeriesClick(series.id)}
                        className="rounded-[24px] border border-white/10 bg-black/10 p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                              Rank #{index + 2}
                            </p>
                            <p className="mt-2 text-lg font-semibold text-white">{series.title}</p>
                          </div>
                          {series.badge ? <Pill>{series.badge}</Pill> : null}
                        </div>
                        <Cover tone={series.coverTone} coverUrl={series.coverUrl} className="mt-4 h-40 rounded-[20px]" />
                        <p className="mt-4 text-xs text-neutral-400">{formatSeriesMeta(series)}</p>
                      </button>
                    ))}
                  </div>
                ) : null}

                <CreatorShelfLinks
                  items={spotlightEntries}
                  entryPoint="RANKINGS_CREATOR_CHIP"
                  campaignId={`${tab}_${selectedWindow}_spotlight_creator`}
                  sourcePath={rankingsPath}
                  label="Chart creators"
                  title="Creators shaping this board"
                  description="Top-ranking charts should expose creator discovery, not just title order. These links turn leaderboard heat into author-level exploration."
                  maxCreators={5}
                />
              </SurfacePanel>

              <StorefrontEventHub
                eyebrow="Chart room"
                title="Use the board like a live storefront room, not a static score list."
                description="Strong ranking pages turn social proof into a series click, a comparison route, and a value path before momentum cools off."
                events={rankingEventCards}
              />
            </div>

            <SurfacePanel className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                    Leaderboard
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                    {activeTab.label} chart | {activeWindow.label}
                  </h2>
                </div>
                <p className="text-xs text-neutral-500">{list.length} entries loaded</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                        <p className="text-xs text-neutral-500">{series.genres.slice(0, 3).join(" | ")}</p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </SurfacePanel>
          </>
        )}
      </div>
    </main>
  );
}
