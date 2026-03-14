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
import { siteConfig } from "../../lib/siteConfig";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), {
  ssr: false,
});

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

const HOME_PILLARS = [
  "Fast discovery",
  "Reliable 18+ controls",
  "Editorial shelves",
];

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
  loading: () => <div className="sticky top-0 z-40 h-[72px] border-b border-white/5 bg-neutral-950/90" />,
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

  useEffect(() => {
    trackEvent("view_home", {});
  }, []);

  const heroItems = useMemo(() => {
    if (!seriesList || seriesList.length === 0) {
      return [];
    }

    const featured = seriesList
      .filter((series) => series.badge === "HOT" || series.badge === "Hot" || (series.rating || 0) >= 4.5)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6)
      .map((series) => ({
        id: `hero-${series.id}`,
        seriesId: series.id,
        latestEpisodeId: series.latestEpisodeId || null,
        title: series.title,
        description: series.description || `${series.genres?.join(" | ") || ""}`,
        coverTone: series.coverTone || "default",
        coverUrl: series.coverUrl,
        bannerUrl: series.bannerUrl || null,
        badge: series.badge,
      }));

    if (branding?.homeBannerUrl && featured.length > 0) {
      featured[0] = { ...featured[0], bannerUrl: branding.homeBannerUrl };
    }

    return featured.length > 0
      ? featured
      : seriesList.slice(0, 4).map((series) => ({
          id: `hero-${series.id}`,
          seriesId: series.id,
          latestEpisodeId: series.latestEpisodeId || null,
          title: series.title,
          description: series.description || "",
          coverTone: series.coverTone || "default",
          coverUrl: series.coverUrl,
          bannerUrl: null,
          badge: series.badge,
        }));
  }, [seriesList, branding?.homeBannerUrl]);

  const editorialStats = useMemo(() => {
    if (loading) {
      return [
        { label: "Series live", value: "--", hint: "Across comics and novels" },
        { label: "Fresh drops", value: "--", hint: "Recently tagged new" },
        { label: "Genre lanes", value: "--", hint: "Filter without dead ends" },
        { label: "18+ catalog", value: "--", hint: "Protected behind sign-in" },
      ];
    }

    const safeSeries = Array.isArray(seriesList) ? seriesList : [];
    const genres = new Set();
    let newCount = 0;
    let adultCount = 0;

    safeSeries.forEach((series) => {
      if (series?.adult) {
        adultCount += 1;
      }

      const badges = [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])]
        .filter(Boolean)
        .map((badge) => String(badge).toUpperCase());

      if (badges.includes("NEW")) {
        newCount += 1;
      }

      if (Array.isArray(series?.genres)) {
        series.genres.forEach((genre) => genres.add(genre));
      }
    });

    return [
      { label: "Series live", value: safeSeries.length.toLocaleString(), hint: "Across comics and novels" },
      { label: "Fresh drops", value: newCount.toLocaleString(), hint: "Recently tagged new" },
      { label: "Genre lanes", value: genres.size.toLocaleString(), hint: "Filter without dead ends" },
      { label: "18+ catalog", value: adultCount.toLocaleString(), hint: "Protected behind sign-in" },
    ];
  }, [loading, seriesList]);

  return (
    <div className="min-h-screen bg-transparent">
      <SiteHeader />

      <main className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 sm:pb-8 lg:px-8">
        <div className="py-4 md:py-6">
          {loading ? <HeroBannerSkeleton /> : <HeroCarousel items={heroItems} />}
        </div>

        <section className="relative mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-5 py-6 shadow-[0_24px_100px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:px-7 sm:py-8 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.12),transparent_22%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
                Editor&apos;s desk
              </p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-[3.65rem]">
                Premium comics and novels, arranged like a real storefront.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-200 sm:text-base">
                {siteConfig.tagline}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-400">
                {siteConfig.defaultDescription}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/comics")}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  Browse comics
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  Search titles
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {HOME_PILLARS.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {editorialStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.14)] backdrop-blur-lg"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                    {stat.label}
                  </p>
                  <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{stat.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-10 grid gap-4 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div className="min-w-0 rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-5 backdrop-blur-xl sm:px-6 sm:py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
              Browse by mood
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Move from spotlight to shelf in one tap.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-neutral-400">
              Pick a lane and the rails below tighten around it. No filler categories, no cluttered storefront,
              no dead-end navigation.
            </p>
          </div>

          <div className="min-w-0 rounded-[28px] border border-white/10 bg-black/20 px-4 py-4 backdrop-blur-xl sm:px-5">
            <div className="flex items-center justify-between gap-3 px-2">
              <p className="text-sm font-semibold text-white">Shortcut filters</p>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Live catalog</p>
            </div>
            <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {GENRE_CHIPS.map((chip) => {
                const isActive = activeGenre === chip.id;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setActiveGenre(chip.id)}
                    className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                      isActive
                        ? "bg-white text-neutral-950 shadow-[0_12px_40px_rgba(255,255,255,0.16)]"
                        : "border border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

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
