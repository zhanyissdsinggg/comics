/**
 * HomePage - 参考 Webtoon/Tapas 首页设计
 * Hero Banner + Genre Filter Chips + Rails 内容网格
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import HeroCarousel from "./HeroCarousel";
import LoginPrompt from "../auth/LoginPrompt";
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import HomeRailsContainer from "./HomeRailsContainer";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useFollowStore } from "../../store/useFollowStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useBrandingStore } from "../../store/useBrandingStore";
import { track } from "../../lib/analytics";

// Genre chip 配置
const GENRE_CHIPS = [
  { id: "all", label: "All" },
  { id: "action", label: "Action" },
  { id: "romance", label: "Romance" },
  { id: "fantasy", label: "Fantasy" },
  { id: "drama", label: "Drama" },
  { id: "thriller", label: "Thriller" },
  { id: "comedy", label: "Comedy" },
  { id: "sci-fi", label: "Sci-Fi" },
  { id: "horror", label: "Horror" },
];

// 骨架屏
function SkeletonRail() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-36 animate-pulse rounded bg-neutral-800" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-[3/4] animate-pulse rounded-xl bg-neutral-800" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroBannerSkeleton() {
  return (
    <div className="aspect-[21/9] w-full animate-pulse rounded-2xl bg-neutral-800 sm:aspect-[21/8] md:aspect-[21/7]" />
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdultMode } = useAdultGateStore();
  const { loadFollowed } = useFollowStore();
  const { branding } = useBrandingStore();
  const { loadHistory } = useHistoryStore();
  const { isSignedIn } = useAuthStore();
  const { loading, seriesList } = useHomeData();

  const [activeGenre, setActiveGenre] = useState("all");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // 加载用户数据
  useEffect(() => {
    if (isSignedIn) {
      loadFollowed();
      loadHistory();
    }
  }, [loadFollowed, loadHistory, isSignedIn]);

  // 检查 URL 参数 - 登录弹窗
  useEffect(() => {
    const reason = searchParams.get("reason");
    const openLogin = searchParams.get("openLogin");
    if (reason === "NEED_LOGIN" || openLogin === "1") {
      setShowLoginPrompt(true);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("reason");
      newUrl.searchParams.delete("returnTo");
      newUrl.searchParams.delete("openLogin");
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, router]);

  // Track page view
  useEffect(() => {
    track("view_home", {});
  }, []);

  // Hero items - 从 seriesList 动态生成
  const heroItems = useMemo(() => {
    if (!seriesList || seriesList.length === 0) return [];
    const featured = seriesList
      .filter((s) => s.badge === "HOT" || s.badge === "Hot" || (s.rating || 0) >= 4.5)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6)
      .map((s) => ({
        id: `hero-${s.id}`,
        title: s.title,
        description: s.description || `${s.genres?.join(" · ") || ""}`,
        coverTone: s.coverTone || "default",
        coverUrl: s.coverUrl,
        bannerUrl: s.bannerUrl || null,
        badge: s.badge,
      }));
    if (branding?.homeBannerUrl && featured.length > 0) {
      featured[0] = { ...featured[0], bannerUrl: branding.homeBannerUrl };
    }
    return featured.length > 0 ? featured : seriesList.slice(0, 4).map((s) => ({
      id: `hero-${s.id}`,
      title: s.title,
      description: s.description || "",
      coverTone: s.coverTone || "default",
      coverUrl: s.coverUrl,
      bannerUrl: null,
      badge: s.badge,
    }));
  }, [seriesList, branding?.homeBannerUrl]);

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />

      <main className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 sm:pb-6 lg:px-8">
        {/* ===== Hero Banner ===== */}
        <div className="py-4 md:py-6">
          {loading ? <HeroBannerSkeleton /> : <HeroCarousel items={heroItems} />}
        </div>

        {/* ===== Genre Filter Chips - 像 Webtoon 的分类筛选 ===== */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {GENRE_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveGenre(chip.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                activeGenre === chip.id
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* ===== Content Rails ===== */}
        {loading ? (
          <div className="space-y-10">
            <SkeletonRail />
            <SkeletonRail />
            <SkeletonRail />
          </div>
        ) : (
          <HomeRailsContainer activeGenre={activeGenre} />
        )}
      </main>

      {/* 登录弹窗 */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={() => router.push("/login")}
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
