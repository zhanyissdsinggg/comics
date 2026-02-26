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
    <aside className="space-y-6">
      {/* 老王说：欧美风格钱包卡片 - 扁平、大胆、简洁 */}
      <div className="rounded-3xl bg-neutral-900 border border-neutral-800 p-8 hover:border-neutral-700 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Wallet</h3>
        </div>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-300 uppercase tracking-wide">Paid Points</span>
            <span className="text-2xl font-bold text-white">{formatUSNumber(paidPts)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-300 uppercase tracking-wide">Bonus Points</span>
            <span className="text-2xl font-bold text-emerald-400">{formatUSNumber(bonusPts)}</span>
          </div>
          <div className="flex items-center justify-between pt-5 border-t border-neutral-800">
            <span className="text-sm font-medium text-neutral-300 uppercase tracking-wide">Plan</span>
            <span className="text-base font-bold text-white uppercase tracking-wider">{plan}</span>
          </div>
        </div>
      </div>

      {/* 老王说：欧美风格倒计时卡片 */}
      <div className="rounded-3xl bg-neutral-900 border border-neutral-800 p-8 hover:border-neutral-700 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Free Unlock</h3>
        </div>
        <p className="text-sm font-medium text-neutral-300 uppercase tracking-wide mb-3">Next unlock in</p>
        <p className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">{formatted || "--:--:--"}</p>
        <button
          type="button"
          onClick={() => router.push("/subscribe")}
          className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-white hover:bg-emerald-600 transition-colors uppercase tracking-wide"
        >
          Get Premium
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
    <div className="min-h-screen bg-neutral-950">
      {/* 老王说：欧美风格 - 简洁的背景，不要过多装饰 */}
      <OnboardingTour />
      <SiteHeader onSearch={setQuery} />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 md:px-6 md:pt-12">
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
            {/* 老王说：欧美风格分类chips - 扁平、大胆、简洁 */}
            <div className="flex flex-wrap items-center gap-3">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveChip(chip.id)}
                  className={`rounded-2xl px-6 py-3 text-base font-bold transition-colors uppercase tracking-wide ${
                    activeChip === chip.id
                      ? "bg-emerald-500 text-white"
                      : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
              <div className="rounded-2xl bg-neutral-900 border border-neutral-800 px-6 py-3 text-base font-bold text-neutral-300 uppercase tracking-wide">
                {homeTab === "novels" ? "📚 Novels" : "📖 Comics"}
              </div>
              {query ? (
                <div className="rounded-2xl bg-amber-500/20 border border-amber-500/30 px-6 py-3 text-base font-bold text-amber-300 uppercase tracking-wide">
                  🔍 {query}
                </div>
              ) : null}
            </div>
            <div className="lg:grid lg:grid-cols-12 gap-6 md:gap-8">
              <div className="space-y-8 md:space-y-12 lg:col-span-8">
                <section className="space-y-6">
                  {followingUpdates.length === 0 ? (
                    <div className="rounded-3xl bg-neutral-900 border border-neutral-800 p-12 text-center hover:border-neutral-700 transition-colors">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">No Following Yet</h3>
                      <p className="text-base text-neutral-300 mb-8 max-w-md mx-auto leading-relaxed">
                        Start following series to see updates here.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveChip("popular")}
                        className="rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-white hover:bg-emerald-600 transition-colors uppercase tracking-wide"
                      >
                        Browse Popular
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
                  <div className="rounded-3xl bg-neutral-900 border border-neutral-800 p-12 text-center hover:border-neutral-700 transition-colors">
                    <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">No Results Found</h3>
                    <p className="text-base text-neutral-300 mb-8 max-w-md mx-auto leading-relaxed">
                      Try different keywords or browse our popular picks.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="rounded-2xl bg-neutral-800 border border-neutral-700 px-6 py-3 text-base font-bold text-neutral-200 hover:bg-neutral-700 transition-colors uppercase tracking-wide"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveChip("popular")}
                        className="rounded-2xl bg-emerald-500 px-6 py-3 text-base font-bold text-white hover:bg-emerald-600 transition-colors uppercase tracking-wide"
                      >
                        Browse Popular
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
