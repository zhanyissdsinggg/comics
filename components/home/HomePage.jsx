/**
 * HomePage - 简化重构版本
 *
 * 职责：
 * - 组合各个子组件
 * - 处理页面级的状态和事件
 * - 提供整体布局
 *
 * 重构说明：
 * - 数据获取逻辑 → HomeDataProvider
 * - 推荐算法逻辑 → HomeRecommendations
 * - Rails渲染逻辑 → HomeRailsContainer
 * - 钱包侧边栏 → WalletAside (保持独立)
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import HeroCarousel from "./HeroCarousel";
import Chip from "../common/Chip";
import LoginNotice from "./LoginNotice";
import StaleDataNotice from "./StaleDataNotice";
import NewUserWelcome from "./NewUserWelcome";
import TrendingKeywords from "./TrendingKeywords";
import OnboardingTour from "../common/OnboardingTour";
import WalletAside from "./WalletAside";
import LoginPrompt from "../auth/LoginPrompt"; // 老王添加：登录弹窗组件
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import HomeRailsContainer from "./HomeRailsContainer";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useHomeStore } from "../../store/useHomeStore";
import { useFollowStore } from "../../store/useFollowStore";
import { useBrandingStore } from "../../store/useBrandingStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useAuthStore } from "../../store/useAuthStore";
import { track } from "../../lib/analytics";

// Hero carousel items (TODO: move to API)
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

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdultMode } = useAdultGateStore();
  const { homeTab } = useHomeStore();
  const { loadFollowed } = useFollowStore();
  const { branding } = useBrandingStore();
  const { loadHistory } = useHistoryStore();
  const { isSignedIn } = useAuthStore();
  const { hotKeywords, hotWindow, setHotWindow, loading, showStale, seriesList } = useHomeData();

  const [activeChip, setActiveChip] = useState("popular");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false); // 老王修改：改用弹窗而不是横幅

  // Load user data on mount
  // 老王修复：只有登录用户才加载关注列表，避免401错误
  useEffect(() => {
    if (isSignedIn) {
      loadFollowed();
    }
  }, [loadFollowed, isSignedIn]);

  useEffect(() => {
    if (isSignedIn) {
      loadHistory();
    }
  }, [isSignedIn, loadHistory]);

  // 老王修改：检查是否需要显示登录弹窗
  useEffect(() => {
    const reason = searchParams.get("reason");
    const openLogin = searchParams.get("openLogin");

    // 老王修复：支持从/login或/signin页面跳转过来打开登录弹窗
    if (reason === "NEED_LOGIN" || openLogin === "1") {
      setShowLoginPrompt(true);
      // 清除 URL 参数，避免刷新页面时重复显示
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("reason");
      newUrl.searchParams.delete("returnTo");
      newUrl.searchParams.delete("openLogin");
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, router]);

  // Track page view
  useEffect(() => {
    track("view_home", { tab: homeTab });
  }, [homeTab]);

  // Update active chip based on adult mode
  useEffect(() => {
    setActiveChip(isAdultMode ? "adult" : "popular");
  }, [isAdultMode]);

  // 老王修复：从seriesList动态生成hero items，不再使用硬编码数据
  const heroItems = useMemo(() => {
    // 如果seriesList为空，使用fallback数据
    if (!seriesList || seriesList.length === 0) {
      return baseHeroItems;
    }

    // 从seriesList中选择高评分或Hot标签的作品作为hero items
    const featuredSeries = seriesList
      .filter((series) => series.badge === "Hot" || series.rating >= 4.5)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6) // 取前6个作品
      .map((series) => ({
        id: `hero-${series.id}`,
        title: series.title,
        description: series.description || `${series.type} · ${series.genres?.join(", ") || ""}`,
        coverTone: series.coverTone || "warm",
        coverUrl: series.coverUrl,
        bannerUrl: series.bannerUrl, // 如果有bannerUrl就用，没有就用coverUrl
      }));

    // 如果没有符合条件的作品，就取前6个
    if (featuredSeries.length === 0) {
      return seriesList.slice(0, 6).map((series) => ({
        id: `hero-${series.id}`,
        title: series.title,
        description: series.description || `${series.type} · ${series.genres?.join(", ") || ""}`,
        coverTone: series.coverTone || "warm",
        coverUrl: series.coverUrl,
        bannerUrl: series.bannerUrl,
      }));
    }

    // 如果有branding的homeBannerUrl，应用到第一个item
    if (branding?.homeBannerUrl && featuredSeries.length > 0) {
      featuredSeries[0] = { ...featuredSeries[0], bannerUrl: branding.homeBannerUrl };
    }

    return featuredSeries;
  }, [seriesList, branding?.homeBannerUrl]);

  // 老王修复：处理热搜关键词点击
  const handleKeywordClick = (keyword) => {
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  // Category chips
  const chips = [
    { id: "popular", label: "Popular" },
    { id: "daily", label: "Daily" },
    { id: "new", label: "New" },
    { id: "completed", label: "Completed" },
    { id: "ttf", label: "TTF" },
    ...(isAdultMode ? [{ id: "adult", label: "Adult" }] : []),
  ];

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />

      <main className="mx-auto max-w-[1200px] px-4 py-6 pb-24 sm:px-6 sm:pb-6">
        {/* Stale data notice */}
        {showStale && <StaleDataNotice />}

        {/* Rails container - FAKKU风格：直接展示内容网格 */}
        {loading ? (
          <div className="space-y-10">
            <div>
              <div className="mb-4 h-8 w-48 bg-neutral-800 rounded animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-[3/4] bg-neutral-800 rounded-lg animate-pulse" />
                    <div className="h-4 w-3/4 bg-neutral-800 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-neutral-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <HomeRailsContainer />
        )}
      </main>

      {/* Onboarding tour */}
      <OnboardingTour />

      {/* 老王添加：登录弹窗 */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={() => {
          // 跳转到登录页面或触发登录流程
          router.push("/login");
        }}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <HomeDataProvider>
      <HomeContent />
    </HomeDataProvider>
  );
}
