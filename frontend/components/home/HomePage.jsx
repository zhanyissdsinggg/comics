/**
 * Home page shell focused on story discovery first, with cleaner shelves below.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  CheckCircle2,
  Compass,
  Flame,
  Gift,
  Sparkles,
  WalletCards,
} from "lucide-react";
import Cover from "../common/Cover";
import PortraitCard from "./PortraitCard";
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import { useFollowStore } from "../../store/useFollowStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useProgressStore } from "../../store/useProgressStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useBrandingStore } from "../../store/useBrandingStore";
import { trackEvent } from "../../lib/trackEvent";
import { consumeCommerceSuccessForPath, getCommerceSuccessPresentation } from "../../lib/commerceSuccess";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import { buildHomeHeroItems, getHomeEditorialSnapshot, getSeriesScore } from "../../lib/homeMerchandising";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), { ssr: false });
const CommerceSuccessBanner = dynamic(() => import("../common/CommerceSuccessBanner"));
const SiteHeader = dynamic(() => import("../layout/SiteHeader"), {
  ssr: false,
  loading: () => <div className="sticky top-0 z-40 h-[72px] border-b border-black/6 bg-[rgba(246,247,251,0.82)] backdrop-blur-xl" />,
});
const HomeRailsContainer = dynamic(() => import("./HomeRailsContainer"), {
  loading: () => (
    <div className="space-y-10">
      <div className="h-72 rounded-[28px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]" />
      <div className="h-72 rounded-[28px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]" />
    </div>
  ),
});

function toTimestamp(value) {
  const parsed = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEpisodeLabel(value) {
  const match = String(value || "").match(/(\d+)(?!.*\d)/);
  return match ? `Episode ${match[1]}` : "Episode";
}

function formatPercent(value) {
  const numeric = Number(value);
  return !Number.isFinite(numeric) || numeric <= 0 ? "0%" : `${Math.round((numeric <= 1 ? numeric : numeric / 100) * 100)}%`;
}

function formatCompactNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "0";
  }
  if (numeric >= 1000000) {
    return `${(numeric / 1000000).toFixed(numeric >= 10000000 ? 0 : 1).replace(/\.0$/, "")}M`;
  }
  if (numeric >= 1000) {
    return `${(numeric / 1000).toFixed(numeric >= 10000 ? 0 : 1).replace(/\.0$/, "")}K`;
  }
  return numeric.toLocaleString();
}

function formatRating(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric.toFixed(1).replace(/\.0$/, "");
}

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatUpdatedLabel(value) {
  const timestamp = toTimestamp(value);
  if (!timestamp) {
    return "Updated recently";
  }
  return `Updated ${compactDateFormatter.format(new Date(timestamp))}`;
}

function getDiscoveryBadge(series) {
  const badgeTokens = [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])]
    .filter(Boolean)
    .map((badge) => String(badge).trim().toUpperCase());

  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Completed";
  }
  if (Number(series?.freeEpisodeCount || 0) > 0 || series?.hasFreeEpisodes) {
    return "Free";
  }
  if (badgeTokens.includes("NEW")) {
    return "New";
  }
  if (badgeTokens.includes("HOT")) {
    return "Trending";
  }
  return "";
}

function getReadingState(series) {
  const freeEpisodeCount = Number(series?.freeEpisodeCount || 0);
  const completed = String(series?.status || "").toLowerCase() === "completed";
  if (completed) {
    return "Completed series";
  }
  if (freeEpisodeCount > 0) {
    return `${freeEpisodeCount} free chapter${freeEpisodeCount === 1 ? "" : "s"}`;
  }
  return "Updated weekly";
}

function dedupeSeries(seriesList) {
  const seen = new Set();
  return (Array.isArray(seriesList) ? seriesList : []).filter((series) => {
    const seriesId = String(series?.id || "").trim();
    if (!seriesId || seen.has(seriesId)) {
      return false;
    }
    seen.add(seriesId);
    return true;
  });
}

function SpotlightItem({ item, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[22px] border border-black/6 bg-white/72 p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:border-black/10 hover:bg-white"
    >
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-[14px] border border-black/6 bg-slate-200">
        <Cover
          tone={item.coverTone}
          coverUrl={item.coverUrl}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{item.meta}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-900" />
    </button>
  );
}

function HomeEntryCard({ card, onOpenSeries, onOpenCollection }) {
  return (
    <Card className="overflow-hidden rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,249,252,0.98))] py-0 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <CardContent className="p-5 sm:p-6">
        <div className="max-w-[20rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{card.eyebrow}</p>
          <h2 className="mt-3 font-display text-[1.75rem] font-semibold tracking-tight text-slate-950">{card.title}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">{card.description}</p>
        </div>

        <div className="mt-6 space-y-3">
          {card.items.map((item) => (
            <SpotlightItem
              key={item.id}
              item={item}
              onClick={() => onOpenSeries(item.id, card.entryPoint, `${card.entryPoint}_${item.id}`)}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenCollection(card.href)}
          className="mt-5 h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
        >
          {card.ctaLabel}
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function ValueCard({ icon: Icon, eyebrow, title, description }) {
  return (
    <Card className="overflow-hidden rounded-[28px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] py-0 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
      <CardContent className="flex h-full gap-4 p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(47,107,255,0.08)] text-[var(--gush-accent,#2f6bff)]">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceLinkCard({ eyebrow, title, description, label, onClick }) {
  return (
    <Card className="overflow-hidden rounded-[26px] border border-black/6 bg-white/92 py-0 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
        <h3 className="mt-3 font-display text-[1.3rem] font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <Button
          type="button"
          variant="outline"
          onClick={onClick}
          className="mt-4 h-10 rounded-full border-black/8 bg-white px-4 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
        >
          {label}
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { followedSeriesIds, loadFollowed } = useFollowStore();
  const { items: historyItems, loadHistory } = useHistoryStore();
  const { bySeriesId: progressMap, loadProgress } = useProgressStore();
  const { isSignedIn } = useAuthStore();
  const { branding } = useBrandingStore();
  const { loading, seriesList, homepageSlots } = useHomeData();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [commerceNotice, setCommerceNotice] = useState(null);

  useEffect(() => {
    if (isSignedIn) {
      loadFollowed();
      loadHistory();
      loadProgress();
    }
  }, [isSignedIn, loadFollowed, loadHistory, loadProgress]);

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
  useEffect(() => {
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/")));
  }, []);

  const heroItems = useMemo(
    () => buildHomeHeroItems(seriesList, { bannerUrl: branding?.homeBannerUrl, homepageSlots }),
    [branding?.homeBannerUrl, homepageSlots, seriesList],
  );
  const editorialSnapshot = useMemo(
    () => getHomeEditorialSnapshot(seriesList, { homepageSlots }),
    [homepageSlots, seriesList],
  );
  const seriesById = useMemo(() => new Map(seriesList.map((series) => [series.id, series])), [seriesList]);
  const featuredHero = heroItems[0] || null;
  const featuredSeries =
    (featuredHero?.seriesId ? seriesById.get(featuredHero.seriesId) : null) ||
    editorialSnapshot.breakoutPick ||
    editorialSnapshot.freeStartPick ||
    editorialSnapshot.completedPick ||
    seriesList[0] ||
    null;
  const featuredBannerUrl =
    featuredHero?.bannerUrl || branding?.homeBannerUrl || featuredSeries?.bannerUrl || null;
  const featuredSignals = useMemo(() => {
    if (!featuredSeries) {
      return [];
    }

    const signals = [];
    if (Array.isArray(featuredSeries.genres)) {
      signals.push(...featuredSeries.genres.slice(0, 3));
    }
    const ratingLabel = formatRating(featuredSeries.rating);
    if (ratingLabel && Number(featuredSeries.ratingCount || 0) > 0) {
      signals.push(`${ratingLabel} stars`);
    }
    signals.push(getReadingState(featuredSeries));
    return signals;
  }, [featuredSeries]);
  const heroSupportingItems = useMemo(
    () =>
      heroItems
        .slice(1, 2)
        .map((item) => seriesById.get(item.seriesId))
        .filter(Boolean)
        .map((series) => ({
          id: series.id,
          title: series.title,
          meta:
            Array.isArray(series.genres) && series.genres.length > 0
              ? series.genres.slice(0, 2).join(" / ")
              : getReadingState(series),
          coverUrl: series.coverUrl,
          coverTone: series.coverTone,
        })),
    [heroItems, seriesById],
  );
  const heroTrustItems = useMemo(
    () => [
      "Free chapters on select series",
      "Unlock episodes with points",
      "Membership for regular readers",
      "18+ controls when you want them",
    ],
    [],
  );

  const progressEntries = useMemo(
    () =>
      Object.entries(progressMap || {}).sort(
        ([, left], [, right]) => toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt),
      ),
    [progressMap],
  );
  const continueItems = useMemo(
    () =>
      progressEntries
        .map(([seriesId, progress]) => {
          const series = seriesById.get(seriesId);
          return !series || !progress?.lastEpisodeId
            ? null
            : {
                seriesId,
                episodeId: progress.lastEpisodeId,
                progressPercent: Number(progress.percent || 0),
              };
        })
        .filter(Boolean),
    [progressEntries, seriesById],
  );
  const recentHistoryItems = useMemo(
    () =>
      (Array.isArray(historyItems) ? historyItems : [])
        .map((entry) => {
          const series = seriesById.get(entry?.seriesId);
          return !series || !entry?.episodeId
            ? null
            : {
                seriesId: entry.seriesId,
                episodeId: entry.episodeId,
                updatedAt: toTimestamp(entry.createdAt),
              };
        })
        .filter(Boolean)
        .sort((left, right) => right.updatedAt - left.updatedAt),
    [historyItems, seriesById],
  );
  const resumeSpotlight = continueItems[0] || recentHistoryItems[0] || null;
  const resumeSeries = resumeSpotlight ? seriesById.get(resumeSpotlight.seriesId) || null : null;
  const leaderboardItems = useMemo(() => {
    const seen = new Set();
    return [
      editorialSnapshot.breakoutPick,
      editorialSnapshot.freeStartPick,
      editorialSnapshot.completedPick,
      ...editorialSnapshot.safeCatalog,
    ]
      .filter(Boolean)
      .filter((series) => {
        const seriesId = String(series?.id || "").trim();
        if (!seriesId || seen.has(seriesId)) {
          return false;
        }
        seen.add(seriesId);
        return true;
      })
      .map((series) => {
        const hasFree = Boolean(series?.hasFreeEpisodes || Number(series?.freeEpisodeCount) > 0);
        const completed = String(series?.status || "").toLowerCase() === "completed";
        const badgeTokens = [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])]
          .filter(Boolean)
          .map((badge) => String(badge).trim().toUpperCase());
        return {
          id: series.id,
          title: series.title,
          coverUrl: series.coverUrl,
          coverTone: series.coverTone,
          statusLabel: completed
            ? "Completed series"
            : hasFree
              ? `${Number(series?.freeEpisodeCount || 0)} free chapter${Number(series?.freeEpisodeCount || 0) === 1 ? "" : "s"}`
              : "Updated weekly",
          meta:
            Array.isArray(series?.genres) && series.genres.length > 0
              ? series.genres.slice(0, 2).join(" / ")
              : series.author || "Featured series",
          score:
            getSeriesScore(series) +
            (hasFree ? 90 : 0) +
            (completed ? 70 : 0) +
            (badgeTokens.includes("HOT") ? 140 : 0) +
            (badgeTokens.includes("NEW") ? 90 : 0),
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 6);
  }, [editorialSnapshot]);

  const homeEntryCards = useMemo(() => {
    const trendingItems = leaderboardItems.slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.statusLabel,
      coverUrl: item.coverUrl,
      coverTone: item.coverTone,
    }));

    const freeItems = dedupeSeries([
      editorialSnapshot.freeStartPick,
      ...editorialSnapshot.safeCatalog
        .filter((series) => Number(series?.freeEpisodeCount || 0) > 0 || series?.hasFreeEpisodes)
        .sort((left, right) => {
          const freeDelta = Number(right?.freeEpisodeCount || 0) - Number(left?.freeEpisodeCount || 0);
          if (freeDelta !== 0) {
            return freeDelta;
          }
          return getSeriesScore(right) - getSeriesScore(left);
        }),
    ])
      .slice(0, 2)
      .map((series) => ({
        id: series.id,
        title: series.title,
        meta: `${Number(series?.freeEpisodeCount || 0)} free chapter${Number(series?.freeEpisodeCount || 0) === 1 ? "" : "s"}`,
        coverUrl: series.coverUrl,
        coverTone: series.coverTone,
      }));

    const completedItems = dedupeSeries([
      editorialSnapshot.completedPick,
      ...editorialSnapshot.safeCatalog
        .filter((series) => String(series?.status || "").toLowerCase() === "completed")
        .sort((left, right) => getSeriesScore(right) - getSeriesScore(left)),
    ])
      .slice(0, 2)
      .map((series) => ({
        id: series.id,
        title: series.title,
        meta: `${Number(series?.episodeCount || 0).toLocaleString()} episodes`,
        coverUrl: series.coverUrl,
        coverTone: series.coverTone,
      }));

    return [
      {
        id: "trending",
        eyebrow: "Right now",
        title: "Top Series",
        description: "Start with what already has real reader momentum this week.",
        ctaLabel: "Browse top series",
        href: "/rankings?type=popular&window=week",
        icon: Flame,
        entryPoint: "HOME_TRENDING_CARD",
        items: trendingItems,
      },
      {
        id: "start-free",
        eyebrow: "Easy entry",
        title: "Start Free",
        description: "Try the first few chapters before you commit to a paid unlock.",
        ctaLabel: "See free chapters",
        href: "/rankings?type=ttf&window=all",
        icon: BookOpenText,
        entryPoint: "HOME_FREE_CARD",
        items: freeItems,
      },
      {
        id: "completed",
        eyebrow: "No waiting",
        title: "Finished Series",
        description: "For readers who would rather binge than wait.",
        ctaLabel: "See finished series",
        href: "/search?status=Completed&sort=popular",
        icon: CheckCircle2,
        entryPoint: "HOME_COMPLETED_CARD",
        items: completedItems,
      },
    ]
      .filter((card) => card.items.length > 0)
      .slice(0, 3);
  }, [editorialSnapshot, leaderboardItems]);

  const newUpdateItems = useMemo(
    () =>
      dedupeSeries(
        [...editorialSnapshot.safeCatalog].sort((left, right) => {
          const badgeDelta =
            Number(getDiscoveryBadge(right) === "New") - Number(getDiscoveryBadge(left) === "New");
          if (badgeDelta !== 0) {
            return badgeDelta;
          }
          const timeDelta = toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt);
          if (timeDelta !== 0) {
            return timeDelta;
          }
          return getSeriesScore(right) - getSeriesScore(left);
        }),
      )
        .slice(0, 4)
        .map((series) => ({
          id: series.id,
          title: series.title,
          subtitle:
            Array.isArray(series.genres) && series.genres.length > 0
              ? series.genres.slice(0, 2).join(" / ")
              : getReadingState(series),
          coverUrl: series.coverUrl,
          coverTone: series.coverTone,
          badge: getDiscoveryBadge(series),
          updatedLabel: formatUpdatedLabel(series.updatedAt),
        })),
    [editorialSnapshot.safeCatalog],
  );

  const openHomeSeries = (seriesId, entryPoint, campaignId) => {
    if (!seriesId) {
      return;
    }
    const targetPath = `/series/${seriesId}`;
    router.push(
      buildPathWithAttribution(targetPath, {
        entryPoint,
        campaignId,
        sourcePath: "/",
        sourceSeriesId: seriesId,
        returnTo: targetPath,
      }),
    );
  };

  const goResume = () => {
    if (!resumeSpotlight?.seriesId) {
      router.push("/library");
      return;
    }
    const targetPath = resumeSpotlight.episodeId
      ? `/read/${resumeSpotlight.seriesId}/${resumeSpotlight.episodeId}`
      : `/series/${resumeSpotlight.seriesId}`;
    router.push(
      buildPathWithAttribution(targetPath, {
        entryPoint: "HOME_RETURN_LANE",
        campaignId: "resume_spotlight",
        sourcePath: "/",
        sourceSeriesId: resumeSpotlight.seriesId,
        sourceEpisodeId: resumeSpotlight.episodeId || undefined,
        returnTo: targetPath,
      }),
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.14),transparent_24%),radial-gradient(circle_at_78%_10%,rgba(255,255,255,0.72),transparent_22%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="home" />
      <main className="relative mx-auto max-w-[1320px] px-4 pb-24 sm:px-6 sm:pb-12 lg:px-8">
        <section className="py-4 md:py-6">
          {loading ? (
            <div className="aspect-[21/10] w-full animate-pulse rounded-[40px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:aspect-[21/9] md:aspect-[21/8]" />
          ) : featuredSeries ? (
            <Card className="relative overflow-hidden rounded-[40px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] py-0 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
              {featuredBannerUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
                  style={{ backgroundImage: `url(${featuredBannerUrl})` }}
                />
              ) : null}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(247,249,252,0.96))]" />
              <CardContent className="relative grid gap-8 p-5 sm:p-7 xl:grid-cols-[1.04fr_0.96fr] xl:items-start xl:p-8">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Start here</p>
                  <h1 className="mt-4 max-w-3xl font-display text-[2.45rem] font-semibold tracking-tight text-slate-950 sm:text-[3.1rem] xl:text-[3.8rem]">
                    Read comics and novels, start free, and unlock more when you&apos;re ready.
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                    Gush is a reading home for comics and novels with clear pricing, quick support, and a cleaner path from free chapters to paid episodes.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {heroTrustItems.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full border border-black/6 bg-white/72 px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => router.push("/rankings?type=ttf&window=all")}
                      className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Start reading free
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => router.push("/rankings?type=popular&window=week")}
                      className="h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
                    >
                      Browse top series
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                    <button
                      type="button"
                      onClick={() => router.push("/how-it-works")}
                      className="font-medium text-slate-700 transition hover:text-slate-950"
                    >
                      How points and membership work
                    </button>
                    <span className="text-slate-300">/</span>
                    <button
                      type="button"
                      onClick={() => router.push("/mature-content")}
                      className="font-medium text-slate-700 transition hover:text-slate-950"
                    >
                      Mature content settings
                    </button>
                  </div>

                  <div className="mt-8 rounded-[30px] border border-black/6 bg-white/72 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Start here</p>
                        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                          {featuredSeries.title}
                        </h2>
                        {featuredSeries.author ? (
                          <p className="mt-1 text-sm text-slate-500">by {featuredSeries.author}</p>
                        ) : null}
                      </div>
                      {Number(featuredSeries.ratingCount || 0) > 0 ? (
                        <span className="rounded-full border border-black/6 bg-[#f8f9fc] px-3 py-1.5 text-xs font-medium text-slate-700">
                          {formatCompactNumber(featuredSeries.ratingCount)} ratings
                        </span>
                      ) : null}
                    </div>
                    {featuredSeries.description ? (
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{featuredSeries.description}</p>
                    ) : null}
                    {featuredSignals.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {featuredSignals.map((signal) => (
                          <span
                            key={signal}
                            className="rounded-full border border-black/6 bg-[#f8f9fc] px-3 py-1.5 text-xs font-medium text-slate-700"
                          >
                            {signal}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[228px_1fr] xl:grid-cols-[264px_1fr]">
                  <div className="overflow-hidden rounded-[30px] border border-black/6 bg-slate-200 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
                    <Cover tone={featuredSeries.coverTone} coverUrl={featuredSeries.coverUrl} className="aspect-[3/4] w-full" />
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-[30px] border border-black/6 bg-white/76 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Why start here</p>
                    <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">{featuredSeries.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {String(featuredSeries.status || "").toLowerCase() === "completed"
                        ? "A finished run makes the first visit easier because you can keep going without waiting."
                        : Number(featuredSeries.freeEpisodeCount || 0) > 0
                          ? `${Number(featuredSeries.freeEpisodeCount || 0)} free chapter${Number(featuredSeries.freeEpisodeCount || 0) === 1 ? "" : "s"} let you test the hook before you spend anything.`
                          : "Reader momentum and a strong opening make this a better first click than a random catalog pick."}
                    </p>

                    <div className="mt-6 space-y-3">
                      {formatRating(featuredSeries.rating) ? (
                        <div className="rounded-[20px] border border-black/6 bg-[#f8f9fc] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Reader signal</p>
                          <p className="mt-1 text-sm text-slate-900">
                            {formatRating(featuredSeries.rating)} stars from {formatCompactNumber(featuredSeries.ratingCount)} readers
                          </p>
                        </div>
                      ) : null}
                      <div className="rounded-[20px] border border-black/6 bg-[#f8f9fc] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Reading pace</p>
                        <p className="mt-1 text-sm text-slate-900">{getReadingState(featuredSeries)}</p>
                      </div>
                    </div>
                  </div>
                    {heroSupportingItems.length > 0 ? (
                      <div className="rounded-[30px] border border-black/6 bg-white/76 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">One more pick</p>
                        <div className="mt-4 space-y-3">
                          {heroSupportingItems.map((item) => (
                            <SpotlightItem
                              key={item.id}
                              item={item}
                              onClick={() => openHomeSeries(item.id, "HOME_HERO_SECONDARY", `home_hero_secondary_${item.id}`)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <section className="mb-10 grid gap-3 lg:grid-cols-4">
          <ValueCard
            icon={BookOpenText}
            eyebrow="Start free"
            title="Try a series before you commit."
            description="Look for free chapters and quick preview access before you unlock more."
          />
          <ValueCard
            icon={WalletCards}
            eyebrow="Clear pricing"
            title="Points for unlocks, membership for regular readers."
            description="The site shows packs, plans, and purchase history in one place instead of hiding the rules."
          />
          <ValueCard
            icon={BookOpen}
            eyebrow="Reader account"
            title="Keep reading across devices."
            description="Library, purchases, progress, and notifications stay easier to manage once you sign in."
          />
          <ValueCard
            icon={CheckCircle2}
            eyebrow="Control"
            title="Mature-content access stays in your hands."
            description="Turn 18+ titles on only when you want them and keep the settings easy to find."
          />
        </section>

        {commerceNotice ? (
          <div className="mb-8">
            <CommerceSuccessBanner notice={commerceNotice} onDismiss={() => setCommerceNotice(null)} />
          </div>
        ) : null}

        {isSignedIn && resumeSeries ? (
          <section className="mb-10">
            <Card className="overflow-hidden rounded-[32px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] py-0 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <CardContent className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Continue reading</p>
                  <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Pick up where you left off.</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    {resumeSpotlight?.progressPercent > 0 ? `${formatEpisodeLabel(resumeSpotlight.episodeId)} is ${formatPercent(resumeSpotlight.progressPercent)} complete.` : `${formatEpisodeLabel(resumeSpotlight?.episodeId)} is still the fastest way back into the story.`}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[["Continue", continueItems.length], ["History", recentHistoryItems.length], ["Following", followedSeriesIds.length]].map(([label, value], index) => (
                      <span key={String(label)} className={`rounded-full border px-3 py-1.5 text-sm ${index === 0 ? "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-800" : "border-black/6 bg-white/72 text-slate-700"}`}>
                        <span className="font-semibold text-slate-950">{Number(value).toLocaleString()}</span>
                        <span className="ml-2 text-slate-500">{label}</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button type="button" size="lg" onClick={goResume} className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800">Continue reading</Button>
                    <Button type="button" size="lg" variant="outline" onClick={() => router.push(`/series/${resumeSeries.id}`)} className="h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]">Open series</Button>
                    <Button type="button" size="lg" variant="outline" onClick={() => router.push("/library")} className="h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-black/12 hover:bg-[#f8f9fc]">Library</Button>
                  </div>
                </div>
                <div className="rounded-[28px] border border-black/6 bg-white/72 p-4 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-[148px_1fr]">
                    <div className="aspect-[3/4] rounded-[24px] border border-black/6 bg-neutral-900 bg-cover bg-center shadow-[0_16px_32px_rgba(15,23,42,0.08)]" style={resumeSeries.coverUrl ? { backgroundImage: `linear-gradient(180deg,rgba(12,18,24,0.04),rgba(12,18,24,0.24)), url(${resumeSeries.coverUrl})` } : undefined} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Up next</p>
                      <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">{resumeSeries.title}</h3>
                      <p className="mt-3 text-sm text-slate-600">{formatEpisodeLabel(resumeSpotlight?.episodeId)}{resumeSpotlight?.progressPercent > 0 ? ` / ${formatPercent(resumeSpotlight.progressPercent)} complete` : " / Ready to reopen"}</p>
                      {Array.isArray(resumeSeries.genres) && resumeSeries.genres.length > 0 ? <p className="mt-2 text-sm text-slate-500">{resumeSeries.genres.slice(0, 3).join(" / ")}</p> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {resumeSeries.badge ? <Badge variant="outline" className="rounded-full border-black/8 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-700">{resumeSeries.badge}</Badge> : null}
                        {followedSeriesIds.includes(resumeSeries.id) ? <Badge variant="outline" className="rounded-full border-[rgba(47,107,255,0.16)] bg-[rgba(47,107,255,0.08)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-800">Following</Badge> : null}
                        {resumeSeries.status ? <Badge variant="outline" className="rounded-full border-black/8 bg-[#f8f9fc] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">{resumeSeries.status}</Badge> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {newUpdateItems.length > 0 ? (
          <section className="mb-10 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <Card className="overflow-hidden rounded-[32px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,248,252,0.98))] py-0 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">New this week</p>
                    <h2 className="mt-3 font-display text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.25rem]">
                      Fresh updates with real covers, not placeholder discovery.
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      If this is your first visit, these are the fastest current reads to sample before you dig through the full catalog.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/search?sort=latest")}
                    className="h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
                  >
                    See latest releases
                    <ArrowRight className="size-4" />
                  </Button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {newUpdateItems.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <PortraitCard
                        item={item}
                        tone={item.coverTone}
                        appearance="light"
                        onClick={() => openHomeSeries(item.id, "HOME_NEW_UPDATES", `home_new_update_${item.id}`)}
                      />
                      <p className="px-1 text-xs font-medium text-slate-500">{item.updatedLabel}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[32px] border border-black/6 bg-white/94 py-0 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <CardContent className="p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Know the basics</p>
                <h2 className="mt-3 font-display text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">
                  Know where pricing, support, and account rules live.
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  A good first visit should explain points, billing help, FAQ answers, and 18+ controls without making you hunt through account pages.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      eyebrow: "Pricing",
                      title: "Points and packs",
                      description: "See what is free, what uses points, and where purchase history shows up later.",
                      label: "See pricing",
                      href: "/store",
                    },
                    {
                      eyebrow: "FAQ",
                      title: "Quick answers",
                      description: "Get the plain-English version of billing, access, and common reader questions.",
                      label: "Open FAQ",
                      href: "/faq",
                    },
                    {
                      eyebrow: "Support",
                      title: "Billing help",
                      description: "Know where to go if a charge, receipt, or access issue needs a real person.",
                      label: "Contact support",
                      href: "/support",
                    },
                    {
                      eyebrow: "18+",
                      title: "Mature content",
                      description: "Review age checks, region visibility, and history controls before turning it on.",
                      label: "Review settings",
                      href: "/mature-content",
                    },
                  ].map((item) => (
                    <ResourceLinkCard
                      key={item.href}
                      eyebrow={item.eyebrow}
                      title={item.title}
                      description={item.description}
                      label={item.label}
                      onClick={() => router.push(item.href)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {homeEntryCards.length > 0 ? (
          <section className="mb-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {homeEntryCards.map((card) => (
              <HomeEntryCard
                key={card.id}
                card={card}
                onOpenSeries={openHomeSeries}
                onOpenCollection={(href) => router.push(href)}
              />
            ))}
          </section>
        ) : null}

        <section className="mb-12">
          <Card className="overflow-hidden rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] py-0 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <CardContent className="p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">How Gush works</p>
              <h2 className="mt-3 font-display text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.25rem]">
                A quick way to understand the product.
              </h2>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  {
                    eyebrow: "1. Browse",
                    body: "Open comics and novels, then start with free chapters when they are available.",
                  },
                  {
                    eyebrow: "2. Unlock",
                    body: "Use points when a chapter is locked, or compare membership if you read often.",
                  },
                  {
                    eyebrow: "3. Keep track",
                    body: "Save your library, purchases, and progress so the next visit feels immediate.",
                  },
                ].map((item) => (
                  <div
                    key={item.eyebrow}
                    className="rounded-[24px] border border-black/6 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{item.eyebrow}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/how-it-works")}
                className="mt-5 h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
              >
                See how it works
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Keep browsing</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">Trending, new updates, and easier places to start.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">The shelves below stay short on purpose so discovery still feels calm, not like a dashboard.</p>
          </div>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => router.push("/search")}
            className="h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
          >
            <Compass className="size-4" />
            Browse all series
          </Button>
        </section>

        {loading ? (
          <div className="space-y-10">
            <div className="h-72 rounded-[28px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]" />
            <div className="h-72 rounded-[28px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]" />
          </div>
        ) : (
          <HomeRailsContainer appearance="light" />
        )}

        <LoginPrompt
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
          eyebrow={STOREFRONT_TERMS.readerBenefits}
          title="Save your library and pick up where you left off"
          message="Sign in to sync your library, keep your progress, claim rewards, and make every return visit faster."
          returnTo="/"
          primaryLabel="Sign in and sync"
          secondaryLabel="Create free account"
          features={[
            { icon: BookOpen, text: "Resume chapters and keep your library synced across devices" },
            { icon: Gift, text: "Claim daily rewards, mission payouts, and bonus points" },
            { icon: Sparkles, text: "Get better picks based on what you actually read" },
          ]}
        />
      </main>
    </div>
  );
}

export default function HomePage() {
  return <HomeDataProvider><HomeContent /></HomeDataProvider>;
}
