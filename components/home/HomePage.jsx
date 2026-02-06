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
import { getRecommendations } from "../../lib/recommendation/engine";

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
      {/* 老王说：美化钱包卡片 - 使用glassmorphism和渐变边框 */}
      <div className="relative rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-[1px] backdrop-blur-xl">
        <div className="rounded-2xl bg-neutral-900/80 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Wallet</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Paid Points</span>
              <span className="text-sm font-bold text-emerald-400">{formatUSNumber(paidPts)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Bonus Points</span>
              <span className="text-sm font-bold text-cyan-400">{formatUSNumber(bonusPts)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <span className="text-xs text-neutral-400">Plan</span>
              <span className="text-xs font-semibold text-white uppercase">{plan}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 老王说：美化倒计时卡片 */}
      <div className="relative rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-[1px]">
        <div className="rounded-2xl bg-neutral-900/80 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">TTF Countdown</h3>
          </div>
          <p className="text-xs text-neutral-400 mb-2">Next free unlock in</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent mb-4">{formatted || "--:--:--"}</p>
          <button
            type="button"
            onClick={() => router.push("/subscribe")}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:from-emerald-600 hover:to-cyan-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            Subscribe for perks
          </button>
        </div>
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

  // 老王注释：计算个性化推荐
  const recommendedRail = useMemo(() => {
    if (!isSignedIn || seriesList.length === 0) {
      return [];
    }

    const historySeriesIds = historyItems.map((item) => item.seriesId);
    const progressSeriesIds = Object.keys(progressMap);

    const recommendations = getRecommendations({
      allSeries: seriesList,
      historySeriesIds,
      followedSeriesIds,
      progressSeriesIds,
      limit: 10,
      strategy: "content", // 使用基于内容的推荐
    });

    return recommendations.map((series) => ({
      id: series.id,
      title: series.title,
      subtitle: series.badge || series.status,
      coverTone: series.coverTone,
      isAdult: Boolean(series.adult),
    }));
  }, [seriesList, historyItems, followedSeriesIds, progressMap, isSignedIn]);

  const activeRails = useMemo(() => {
    const rails = [];
    if (isNewUser && starterItems.length > 0) {
      rails.push({
        id: "starter",
        title: "Start Here",
        items: starterItems,
      });
    }
    // 老王注释：为你推荐板块（仅登录用户）
    if (isSignedIn && recommendedRail.length > 0) {
      rails.push({
        id: "recommended",
        title: "为你推荐",
        items: recommendedRail,
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
  }, [reco, isAdultMode, historyRail, isNewUser, starterItems, isSignedIn, recommendedRail]);

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
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
      {/* 老王说：添加背景装饰渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
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
            {/* 老王注释：移除登录提示，让用户自由浏览 */}
            {/* {loginNotice ? (
              <LoginNotice
                onSignIn={() => {
                  const returnTo = `${window.location.pathname}${window.location.search || ""}`;
                  window.dispatchEvent(new CustomEvent("auth:open", { detail: { returnTo } }));
                }}
              />
            ) : null} */}
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
            {/* 老王说：美化分类chips - 使用渐变和更好的hover效果 */}
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveChip(chip.id)}
                  className={`relative rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                    activeChip === chip.id
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30"
                      : "bg-neutral-900/50 text-neutral-300 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 backdrop-blur-sm"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
              <div className="rounded-xl bg-neutral-900/50 border border-neutral-800 px-4 py-2.5 text-sm font-medium text-neutral-400 backdrop-blur-sm">
                {homeTab === "novels" ? "📚 Novels" : "📖 Comics"}
              </div>
              {query ? (
                <div className="rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-4 py-2.5 text-sm font-medium text-amber-400 backdrop-blur-sm">
                  🔍 Search: {query}
                </div>
              ) : null}
            </div>
            <div className="lg:grid lg:grid-cols-12 gap-4 md:gap-6">
              <div className="space-y-6 md:space-y-10 lg:col-span-8">
                <section className="space-y-3">
                  {followingUpdates.length === 0 ? (
                    <div className="relative rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-[1px]">
                      <div className="rounded-2xl bg-neutral-900/80 p-8 backdrop-blur-xl text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </div>
                        <p className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">Following Updates</p>
                        <p className="text-sm text-neutral-400 mb-6">
                          Follow a series to see updates here.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveChip("popular")}
                          className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-emerald-600 hover:to-cyan-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                          Browse popular
                        </button>
                      </div>
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
                  <div className="relative rounded-2xl bg-gradient-to-br from-red-500/10 to-pink-500/10 p-[1px]">
                    <div className="rounded-2xl bg-neutral-900/80 p-8 backdrop-blur-xl text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-lg font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent mb-2">No results</p>
                      <p className="text-sm text-neutral-400 mb-6">
                        Try a different keyword or browse popular picks.
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        <button
                          type="button"
                          onClick={() => setQuery("")}
                          className="rounded-xl bg-neutral-800 border border-neutral-700 px-5 py-2.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 transition-all active:scale-95"
                        >
                          Clear search
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveChip("popular")}
                          className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-emerald-600 hover:to-cyan-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                          Browse popular
                        </button>
                      </div>
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
    </div>
  );
}
