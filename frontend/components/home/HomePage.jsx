/**
 * Home page shell: hero, genre chips and recommendation rails.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import { useFollowStore } from "../../store/useFollowStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useBrandingStore } from "../../store/useBrandingStore";
import { trackEvent } from "../../lib/trackEvent";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), {
  ssr: false,
});

// Genre chips
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

// Skeleton rail while loading
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

const SiteHeader = dynamic(() => import("../layout/SiteHeader"), {
  ssr: false,
  loading: () => <div className="sticky top-0 z-40 h-16 border-b border-white/5 bg-neutral-950/90" />,
});

const HeroCarousel = dynamic(() => import("./HeroCarousel"), {
  loading: () => <HeroBannerSkeleton />,
});

const HomeRailsContainer = dynamic(() => import("./HomeRailsContainer"), {
  loading: () => (
    <div className="space-y-10">
      <SkeletonRail />
      <SkeletonRail />
      <SkeletonRail />
    </div>
  ),
});

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loadFollowed } = useFollowStore();
  const { branding } = useBrandingStore();
  const { loadHistory } = useHistoryStore();
  const { isSignedIn } = useAuthStore();
  const { loading, seriesList } = useHomeData();

  const [activeGenre, setActiveGenre] = useState("all");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Load user-related data after sign-in
  useEffect(() => {
    if (isSignedIn) {
      loadFollowed();
      loadHistory();
    }
  }, [loadFollowed, loadHistory, isSignedIn]);
  useEffect(() => {
    const reason = searchParams.get("reason");
    const openLogin = searchParams.get("openLogin");
    const returnTo = searchParams.get("returnTo") || "/";

    if (openLogin === "1") {
      window.sessionStorage.setItem("mn_open_login", "1");
      window.sessionStorage.setItem("mn_return_to", returnTo);
    } else if (reason === "NEED_LOGIN") {
      setShowLoginPrompt(true);
    }

    if (reason === "NEED_LOGIN" || openLogin === "1") {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("reason");
      newUrl.searchParams.delete("returnTo");
      newUrl.searchParams.delete("openLogin");
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, router]);

  // Track page view
  useEffect(() => {
    trackEvent("view_home", {});
  }, []);

  // Build hero items from live catalog
  const heroItems = useMemo(() => {
    if (!seriesList || seriesList.length === 0) return [];
    const featured = seriesList
      .filter((s) => s.badge === "HOT" || s.badge === "Hot" || (s.rating || 0) >= 4.5)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6)
      .map((s) => ({
        id: `hero-${s.id}`,
        title: s.title,
        description: s.description || `${s.genres?.join(" | ") || ""}`,
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
        <div className="mb-8 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {GENRE_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveGenre(chip.id)}
              className={`shrink-0 rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-xl ${
                activeGenre === chip.id
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-ios-glow scale-105"
                  : "bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10 hover:border-white/20 hover:text-white hover:scale-105"
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


