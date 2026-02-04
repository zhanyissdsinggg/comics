"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import HeroCarousel from "./HeroCarousel";
import Rail from "./Rail";
import Chip from "../common/Chip";
import Skeleton from "../common/Skeleton";
import LoginNotice from "./LoginNotice";
import StaleDataNotice from "./StaleDataNotice";
import NewUserWelcome from "./NewUserWelcome";
import TrendingKeywords from "./TrendingKeywords";
import OnboardingTour from "../common/OnboardingTour";
import useCountdown from "../../hooks/useCountdown";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useHomeStore } from "../../store/useHomeStore";
import { useWalletStore } from "../../store/useWalletStore";
import { useFollowStore } from "../../store/useFollowStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { useBrandingStore } from "../../store/useBrandingStore";
import { track } from "../../lib/analytics";
import { apiGet } from "../../lib/apiClient";
import { useStaleNotice } from "../../hooks/useStaleNotice";
import { recommendRails } from "../../lib/reco/recommender";
import { useProgressStore } from "../../store/useProgressStore";
import { useRetryPolicy } from "../../hooks/useRetryPolicy";
import { formatUSNumber } from "../../lib/localization";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useAuthStore } from "../../store/useAuthStore";

const baseHeroItems = [
  {
    id: "hero-1",
    title: "Midnight Contract",
    description: "A contract that binds two rivals under the midnight moon.",
    coverTone: "warm",
    bannerUrl:
      "https://img2.baidu.com/it/u=2690835672,2180416117&fm=253&fmt=auto&app=138&f=JPEG?w=889&h=500",
  },
  {
    id: "hero-2",
    title: "Crimson Promise",
    description: "A deadly promise turns into an unexpected romance.",
    coverTone: "dusk",
  },
];

function parseLatestNumber(value) {
  if (!value) {
    return 0;
  }
  const match = String(value).match(/(\d+)/);
  if (!match) {
    return 0;
  }
  return Number.parseInt(match[1], 10) || 0;
}

const WalletAside = memo(function WalletAside() {
  const router = useRouter();
  const { paidPts, bonusPts, plan } = useWalletStore();
  const readyAt = useMemo(() => Date.now() + 2 * 60 * 60 * 1000, []);
  const { formatted } = useCountdown(readyAt);

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4">
        <h3 className="text-sm font-semibold">Wallet</h3>
        <div className="mt-3 space-y-2 text-xs text-neutral-400">
          <div>Paid: {formatUSNumber(paidPts)} POINTS</div>
          <div>Bonus: {formatUSNumber(bonusPts)} POINTS</div>
          <div>Plan: {plan}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4">
        <h3 className="text-sm font-semibold">TTF Countdown</h3>
        <p className="mt-3 text-xs text-neutral-400">Next free unlock in</p>
        <p className="mt-2 text-lg font-semibold">{formatted || "--:--:--"}</p>
        <button
          type="button"
          onClick={() => router.push("/subscribe")}
          className="mt-4 w-full rounded-full border border-neutral-700 px-4 py-2 text-xs"
        >
          Subscribe for perks
        </button>
      </div>
    </aside>
  );
});

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdultMode } = useAdultGateStore();
  const { homeTab } = useHomeStore();
  const { followedSeriesIds, loadFollowed } = useFollowStore();
  const { behavior, viewSeries } = useBehaviorStore();
  const { bySeriesId: progressMap } = useProgressStore();
  const { branding } = useBrandingStore();
  const { items: historyItems, loadHistory } = useHistoryStore();
  const { isSignedIn } = useAuthStore();
  const [activeChip, setActiveChip] = useState("popular");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loginNotice, setLoginNotice] = useState(false);
  const [seriesList, setSeriesList] = useState([]);
  const [hotKeywords, setHotKeywords] = useState([]);
  const [hotWindow, setHotWindow] = useState("day");
  const recoImpressionRef = useRef(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    loadFollowed();
    return () => clearTimeout(timer);
  }, [loadFollowed]);

  useEffect(() => {
    if (isSignedIn) {
      loadHistory();
    }
  }, [isSignedIn, loadHistory]);

  useEffect(() => {
    const reason = searchParams.get("reason");
    setLoginNotice(reason === "NEED_LOGIN");
  }, [searchParams]);

  useEffect(() => {
    track("view_home", { tab: homeTab });
  }, [homeTab]);

  const [seriesResponse, setSeriesResponse] = useState(null);
  const showStale = useStaleNotice(seriesResponse);
  const { shouldRetry } = useRetryPolicy();
  const heroItems = useMemo(() => {
    if (!branding?.homeBannerUrl) {
      return baseHeroItems;
    }
    return baseHeroItems.map((item, index) =>
      index === 0 ? { ...item, bannerUrl: branding.homeBannerUrl } : item
    );
  }, [branding?.homeBannerUrl]);

  useEffect(() => {
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }).then((response) => {
      setSeriesResponse(response);
      if (response.ok) {
        setSeriesList(response.data?.series || []);
      } else if (response.status === 0 || response.status >= 500) {
        if (shouldRetry(`home_series_${adultFlag}`)) {
          setTimeout(() => {
            apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000, bust: true }).then(
              (retryResponse) => {
                setSeriesResponse(retryResponse);
                if (retryResponse.ok) {
                  setSeriesList(retryResponse.data?.series || []);
                }
              }
            );
          }, 600);
        }
      }
    });
    setActiveChip(isAdultMode ? "adult" : "popular");
  }, [isAdultMode, shouldRetry]);

  useEffect(() => {
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`).then((response) => {
      if (response.ok) {
        setHotKeywords(response.data?.keywords || []);
      }
    });
  }, [isAdultMode, hotWindow]);

  const chips = [
    { id: "popular", label: "Popular" },
    { id: "daily", label: "Daily" },
    { id: "new", label: "New" },
    { id: "completed", label: "Completed" },
    { id: "ttf", label: "TTF" },
    ...(isAdultMode ? [{ id: "adult", label: "Adult" }] : []),
  ];

  const followingUpdates = useMemo(() => {
    if (!followedSeriesIds || followedSeriesIds.length === 0) {
      return [];
    }
    const catalog = seriesList.length > 0 ? seriesList : [];
    const candidates = catalog.filter((series) => followedSeriesIds.includes(series.id));
    return candidates
      .map((series) => ({
        id: series.id,
        title: series.title,
        subtitle: series.latest || "New episode",
        coverTone: series.coverTone,
        badge: series.badge,
      }))
      .sort((a, b) => parseLatestNumber(b.subtitle) - parseLatestNumber(a.subtitle));
  }, [followedSeriesIds, seriesList]);

  const historyRail = useMemo(() => {
    if (!isSignedIn || !Array.isArray(historyItems) || historyItems.length === 0) {
      return [];
    }
    return historyItems
      .map((entry) => {
        const series = seriesList.find((item) => item.id === entry.seriesId);
        if (!series) {
          return null;
        }
        return {
          id: `${entry.seriesId}-${entry.episodeId}`,
          title: series.title,
          subtitle: `Last read ${entry.episodeId}`,
          coverTone: series.coverTone,
          badge: series.badge,
        };
      })
      .filter(Boolean)
      .slice(0, 10);
  }, [historyItems, isSignedIn, seriesList]);

  const reco = useMemo(
    () => recommendRails(seriesList, behavior, progressMap, { isAdultMode }),
    [behavior, progressMap, isAdultMode, seriesList]
  );

  const isNewUser = useMemo(() => {
    const hasBehavior = (behavior?.events || []).length > 0;
    const hasProgress = Object.keys(progressMap || {}).length > 0;
    return !hasBehavior && !hasProgress;
  }, [behavior?.events, progressMap]);

  const starterItems = useMemo(() => {
    const base = reco.trendingRail.length > 0 ? reco.trendingRail : seriesList;
    return (base || []).slice(0, 8);
  }, [reco.trendingRail, seriesList]);

  const activeRails = useMemo(() => {
    const rails = [];
    if (isNewUser && starterItems.length > 0) {
      rails.push({
        id: "starter",
        title: "Start Here",
        items: starterItems,
      });
    }
    if (reco.continueRail.length > 0) {
      rails.push({
        id: "continue",
        title: "Continue Reading",
        items: reco.continueRail,
      });
    }
    if (historyRail.length > 0) {
      rails.push({
        id: "history",
        title: "Recently Read",
        items: historyRail,
      });
    }
    if (reco.becauseYouReadRail.length > 0) {
      rails.push({
        id: "because",
        title: reco.becauseYouReadTitle || "Because you read",
        items: reco.becauseYouReadRail,
      });
    }
    rails.push({ id: "new", title: "New", items: reco.newRail });
    rails.push({ id: "popular", title: "Popular", items: reco.trendingRail });
    rails.push({ id: "ttf", title: "Time Till Free", items: reco.ttfRail });
    rails.push({ id: "completed", title: "Completed", items: reco.completedRail });
    if (isAdultMode) {
      rails.push({ id: "adult", title: "Adult Picks", items: reco.adultRail, tone: "noir" });
    }
    return rails;
  }, [reco, isAdultMode, historyRail, isNewUser, starterItems]);

  const chipRail = useMemo(() => {
    const map = {
      popular: { id: "chip-popular", title: "Popular", items: reco.trendingRail },
      daily: { id: "chip-daily", title: "Daily", items: reco.trendingRail },
      new: { id: "chip-new", title: "New", items: reco.newRail },
      completed: { id: "chip-completed", title: "Completed", items: reco.completedRail },
      ttf: { id: "chip-ttf", title: "Time Till Free", items: reco.ttfRail },
      adult: {
        id: "chip-adult",
        title: "Adult Picks",
        items: reco.adultRail,
        tone: "noir",
      },
    };
    const rail = map[activeChip];
    if (!rail || !rail.items || rail.items.length === 0) {
      return null;
    }
    return rail;
  }, [activeChip, reco.trendingRail, reco.newRail, reco.completedRail, reco.ttfRail, reco.adultRail]);

  const searchRail = useMemo(() => {
    if (!query || query.trim().length < 2) {
      return null;
    }
    const q = query.trim().toLowerCase();
    const items = seriesList
      .filter((item) => item.title?.toLowerCase().includes(q))
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.latest || "New episode",
        coverTone: item.coverTone,
        badge: item.badge,
      }));
    return { id: "search", title: `Search results for "${query.trim()}"`, items };
  }, [query, seriesList]);

  const searchEmpty =
    query && query.trim().length >= 2 && searchRail && searchRail.items.length === 0;

  useEffect(() => {
    activeRails.forEach((rail) => {
      rail.items.forEach((item) => {
        const key = `${rail.id}:${item.id}`;
        if (recoImpressionRef.current.has(key)) {
          return;
        }
        recoImpressionRef.current.add(key);
        track("reco_impression", { railName: rail.title, seriesId: item.id });
      });
    });
  }, [activeRails]);

  return (
    <div className="min-h-screen bg-neutral-950">
      <OnboardingTour />
      <SiteHeader onSearch={setQuery} />
      <main className="mx-auto max-w-6xl px-3 pb-12 pt-6 md:px-4 md:pt-8">
        {loading ? (
          <div className="space-y-4 md:space-y-6">
            <Skeleton className="h-56 w-full rounded-3xl" />
            <div className="flex gap-2 md:gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={`chip-${index}`} className="h-8 w-20 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-6 md:space-y-10">
            {loginNotice ? (
              <LoginNotice
                onSignIn={() => {
                  const returnTo = `${window.location.pathname}${window.location.search || ""}`;
                  window.dispatchEvent(new CustomEvent("auth:open", { detail: { returnTo } }));
                }}
              />
            ) : null}
            {showStale ? <StaleDataNotice /> : null}
            {isNewUser ? (
              <NewUserWelcome
                starterItems={starterItems}
                onStartReading={(seriesId) => router.push(`/series/${seriesId}`)}
                onBrowsePopular={() => setActiveChip("popular")}
              />
            ) : null}
            <TrendingKeywords
              keywords={hotKeywords}
              hotWindow={hotWindow}
              onWindowChange={setHotWindow}
              onKeywordClick={(keyword) => router.push(`/search?q=${encodeURIComponent(keyword)}`)}
            />
            <HeroCarousel items={heroItems} />
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveChip(chip.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                    activeChip === chip.id
                      ? "bg-white text-neutral-900 shadow-lg"
                      : "border border-neutral-800 text-neutral-300 hover:border-neutral-700 active:bg-neutral-800"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
              <Chip>{homeTab === "novels" ? "Novels" : "Comics"}</Chip>
              {query ? <Chip>Search: {query}</Chip> : null}
            </div>
            <div className="lg:grid lg:grid-cols-12 gap-4 md:gap-6">
              <div className="space-y-6 md:space-y-10 lg:col-span-8">
                <section className="space-y-3">
                  {followingUpdates.length === 0 ? (
                    <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 text-sm text-neutral-400">
                      <p className="text-lg font-semibold text-white">Following Updates</p>
                      <p className="mt-2 text-sm text-neutral-400">
                        Follow a series to see updates here.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveChip("popular")}
                        className="mt-4 w-full rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200"
                      >
                        Browse popular
                      </button>
                    </div>
                  ) : (
                    <Rail
                      title="Following Updates"
                      railName="Following Updates"
                      items={followingUpdates}
                      onItemClick={(item, railName) => {
                        track("reco_click", { railName, seriesId: item.id });
                        viewSeries(item.id);
                        router.push(`/series/${item.id}`);
                      }}
                    />
                  )}
                </section>
                {searchRail && searchRail.items.length > 0 ? (
                  <Rail
                    key={searchRail.id}
                    title={searchRail.title}
                    railName={searchRail.title}
                    items={searchRail.items}
                    onItemClick={(item, railName) => {
                      track("reco_click", { railName, seriesId: item.id });
                      viewSeries(item.id);
                      router.push(`/series/${item.id}`);
                    }}
                  />
                ) : null}
                {searchEmpty ? (
                  <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 text-sm text-neutral-400">
                    <p className="text-lg font-semibold text-white">No results</p>
                    <p className="mt-2 text-sm text-neutral-400">
                      Try a different keyword or browse popular picks.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200"
                      >
                        Clear search
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveChip("popular")}
                        className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900"
                      >
                        Browse popular
                      </button>
                    </div>
                  </div>
                ) : null}
                {chipRail ? (
                  <Rail
                    key={chipRail.id}
                    title={chipRail.title}
                    railName={chipRail.title}
                    items={chipRail.items}
                    tone={chipRail.tone}
                    onItemClick={(item, railName) => {
                      track("reco_click", { railName, seriesId: item.id });
                      viewSeries(item.id);
                      router.push(`/series/${item.id}`);
                    }}
                  />
                ) : null}
                {activeRails.map((rail) => (
                  <Rail
                    key={rail.id}
                    title={rail.title}
                    railName={rail.title}
                    items={rail.items}
                    tone={rail.tone}
                    onItemClick={(item, railName) => {
                      track("reco_click", { railName, seriesId: item.id });
                      viewSeries(item.id);
                      router.push(`/series/${item.id}`);
                    }}
                  />
                ))}
              </div>
              <div className="lg:col-span-4">
                <WalletAside />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
