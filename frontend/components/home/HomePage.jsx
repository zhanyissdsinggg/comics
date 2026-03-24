/**
 * Home page shell focused on fast story discovery for mobile-first storefront traffic.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Flame,
  Gift,
  Sparkles,
  WalletCards,
} from "lucide-react";
import Cover from "../common/Cover";
import SiteHeader from "../layout/SiteHeader";
import SiteFooter from "../layout/SiteFooter";
import PortraitCard from "./PortraitCard";
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useProgressStore } from "../../store/useProgressStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useBrandingStore } from "../../store/useBrandingStore";
import { trackEvent } from "../../lib/trackEvent";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import {
  buildHomeHeroItems,
  getHomeEditorialSnapshot,
  getSeriesScore,
} from "../../lib/homeMerchandising";
import { getSearchParam } from "../../lib/pageSearchParams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), { ssr: false });
const CommerceSuccessBanner = dynamic(() => import("../common/CommerceSuccessBanner"));

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
  return !Number.isFinite(numeric) || numeric <= 0
    ? "0%"
    : `${Math.round((numeric <= 1 ? numeric : numeric / 100) * 100)}%`;
}

function formatCompactNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "0";
  }
  if (numeric >= 1000000) {
    return `${(numeric / 1000000)
      .toFixed(numeric >= 10000000 ? 0 : 1)
      .replace(/\.0$/, "")}M`;
  }
  if (numeric >= 1000) {
    return `${(numeric / 1000)
      .toFixed(numeric >= 10000 ? 0 : 1)
      .replace(/\.0$/, "")}K`;
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

function clampText(value, limit = 180) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit).trimEnd()}...`;
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

function FallbackDiscoveryCard({ eyebrow, title, description, label, onClick }) {
  return (
    <Card className="overflow-hidden rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,248,252,0.98))] py-0 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <CardContent className="p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-[1.75rem] font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        <Button
          type="button"
          variant="outline"
          onClick={onClick}
          className="mt-5 h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
        >
          {label}
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function HomeShelfSection({
  icon: Icon,
  eyebrow,
  title,
  ctaLabel,
  onCtaClick,
  items,
  onItemClick,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {Icon ? <Icon className="size-3.5" /> : null}
            {eyebrow}
          </p>
          <h2 className="mt-3 font-display text-[1.65rem] font-semibold tracking-tight text-slate-950 sm:text-[1.95rem]">
            {title}
          </h2>
        </div>

        {ctaLabel && typeof onCtaClick === "function" ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCtaClick}
            className="h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
          >
            {ctaLabel}
            <ArrowRight className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.id}>
            <PortraitCard
              item={item}
              tone={item.coverTone}
              appearance="light"
              onClick={() => onItemClick?.(item)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeContent({ initialSearchParams = {} }) {
  const router = useRouter();
  const { items: historyItems, loadHistory } = useHistoryStore();
  const { bySeriesId: progressMap, loadProgress } = useProgressStore();
  const { isSignedIn } = useAuthStore();
  const { branding } = useBrandingStore();
  const { loading, seriesList, homepageSlots } = useHomeData();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [commerceNotice, setCommerceNotice] = useState(null);

  useEffect(() => {
    if (isSignedIn) {
      loadHistory();
      loadProgress();
    }
  }, [isSignedIn, loadHistory, loadProgress]);

  useEffect(() => {
    const reason = getSearchParam(initialSearchParams, "reason");
    const openLogin = getSearchParam(initialSearchParams, "openLogin");
    const returnTo = getSearchParam(initialSearchParams, "returnTo", "/");
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
  }, [initialSearchParams, router]);

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

  const seriesById = useMemo(
    () => new Map(seriesList.map((series) => [series.id, series])),
    [seriesList],
  );

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
  const heroSeries = resumeSeries || featuredSeries || null;

  const heroSignals = useMemo(() => {
    if (!heroSeries) {
      return [];
    }

    const signals = [];

    if (resumeSpotlight?.episodeId) {
      signals.push(
        `${formatEpisodeLabel(resumeSpotlight.episodeId)}${
          resumeSpotlight.progressPercent > 0
            ? ` / ${formatPercent(resumeSpotlight.progressPercent)} complete`
            : ""
        }`,
      );
    }

    if (Array.isArray(heroSeries.genres) && heroSeries.genres.length > 0) {
      signals.push(heroSeries.genres.slice(0, 2).join(" / "));
    }

    const ratingLabel = formatRating(heroSeries.rating);
    if (ratingLabel && Number(heroSeries.ratingCount || 0) > 0) {
      signals.push(`${ratingLabel} / ${formatCompactNumber(heroSeries.ratingCount)} ratings`);
    }

    signals.push(getReadingState(heroSeries));

    return signals.filter(Boolean).slice(0, 3);
  }, [heroSeries, resumeSpotlight]);

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
          genres: Array.isArray(series?.genres) ? series.genres : [],
          type: series?.type || "",
          seriesType: series?.type || "",
          status: series?.status || "",
          author: series?.author || "",
          adult: Boolean(series?.adult),
          freeEpisodeCount: Number(series?.freeEpisodeCount || 0),
          hasFreeEpisodes: hasFree,
          subtitle:
            Array.isArray(series?.genres) && series.genres.length > 0
              ? series.genres.slice(0, 2).join(" / ")
              : series.author || "Featured series",
          statusLabel: completed
            ? "Completed series"
            : hasFree
              ? `${Number(series?.freeEpisodeCount || 0)} free chapter${
                  Number(series?.freeEpisodeCount || 0) === 1 ? "" : "s"
                }`
              : "Updated weekly",
          badge: badgeTokens.includes("HOT")
            ? "Trending"
            : getDiscoveryBadge(series) || "",
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

  const topSeriesItems = useMemo(
    () =>
      leaderboardItems.slice(0, 4).map((item, index) => ({
        ...item,
        badge: item.badge || (index === 0 ? "Trending" : ""),
      })),
    [leaderboardItems],
  );

  const freeStartItems = useMemo(
    () =>
      dedupeSeries([
        editorialSnapshot.freeStartPick,
        ...editorialSnapshot.safeCatalog
          .filter(
            (series) => Number(series?.freeEpisodeCount || 0) > 0 || series?.hasFreeEpisodes,
          )
          .sort((left, right) => {
            const freeDelta =
              Number(right?.freeEpisodeCount || 0) - Number(left?.freeEpisodeCount || 0);
            if (freeDelta !== 0) {
              return freeDelta;
            }
            return getSeriesScore(right) - getSeriesScore(left);
          }),
      ])
        .slice(0, 4)
        .map((series) => ({
          id: series.id,
          title: series.title,
          genres: Array.isArray(series?.genres) ? series.genres : [],
          type: series?.type || "",
          seriesType: series?.type || "",
          status: series?.status || "",
          author: series?.author || "",
          adult: Boolean(series?.adult),
          freeEpisodeCount: Number(series?.freeEpisodeCount || 0),
          hasFreeEpisodes: Boolean(series?.hasFreeEpisodes || Number(series?.freeEpisodeCount || 0) > 0),
          subtitle:
            Array.isArray(series?.genres) && series.genres.length > 0
              ? series.genres.slice(0, 2).join(" / ")
              : series.author || "Free start",
          coverUrl: series.coverUrl,
          coverTone: series.coverTone,
          badge: "Free",
          metaLabel:
            Number(series?.freeEpisodeCount || 0) > 0
              ? `${Number(series?.freeEpisodeCount || 0)} free chapter${
                  Number(series?.freeEpisodeCount || 0) === 1 ? "" : "s"
                }`
              : "Free start available",
        })),
    [editorialSnapshot],
  );

  const showCatalogFallback = !loading && !featuredSeries;

  const homepageFallbackCards = useMemo(
    () => [
      {
        id: "trending-now",
        eyebrow: "Top Series",
        title: "Open what readers already trust first.",
        description: "Browse the strongest popular picks first.",
        label: "Browse top series",
        href: "/rankings?type=popular&window=week",
      },
      {
        id: "start-free",
        eyebrow: "Free to Start",
        title: "Try free chapters before you unlock anything.",
        description: "Try free chapters before you commit.",
        label: "Start reading free",
        href: "/rankings?type=ttf&window=all",
      },
    ],
    [],
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

  const heroEyebrow = resumeSeries ? "Continue reading" : "Start reading";
  return (
    <div className="gush-page-shell overflow-hidden">
      <div className="gush-page-ambient h-[clamp(21rem,42vw,34rem)]" />
      <SiteHeader variant="home" />

      <main className="gush-page-main gush-page-main--wide">
        <section className="pb-4 pt-1 md:pb-6">
          {loading ? (
            <div className="aspect-[5/6] w-full animate-pulse rounded-[34px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:aspect-[21/11] lg:aspect-[21/8]" />
          ) : (
            <Card className="relative overflow-hidden rounded-[34px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,246,242,0.96))] py-0 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
              {featuredBannerUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-[0.06]"
                  style={{ backgroundImage: `url(${featuredBannerUrl})` }}
                />
              ) : null}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(49,87,214,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,246,242,0.96))]" />

              <CardContent className="relative grid gap-5 p-4 sm:p-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-center xl:p-8">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {heroEyebrow}
                  </p>
                  <h1 className="mt-3 max-w-3xl font-display text-[2rem] font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-[2.9rem] sm:leading-[1.02] xl:text-[3.4rem] xl:leading-[1]">
                    Stories worth opening on the first tap.
                  </h1>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      size="lg"
                      onClick={
                        resumeSeries
                          ? goResume
                          : () => router.push("/rankings?type=ttf&window=all")
                      }
                      className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      {resumeSeries ? "Continue reading" : "Start reading free"}
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
                </div>

                {heroSeries ? (
                  <div className="rounded-[28px] border border-black/8 bg-white/86 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.04)] sm:p-5">
                    <div className="grid grid-cols-[104px_1fr] gap-4 sm:grid-cols-[140px_1fr] sm:items-start">
                      <div className="overflow-hidden rounded-[24px] border border-black/6 bg-neutral-900 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
                        <Cover
                          tone={heroSeries.coverTone}
                          coverUrl={heroSeries.coverUrl}
                          label={heroSeries.title}
                          genres={heroSeries.genres}
                          seriesType={heroSeries.type}
                          eyebrow={
                            Array.isArray(heroSeries.genres) && heroSeries.genres.length > 0
                              ? heroSeries.genres.slice(0, 2).join(" / ")
                              : ""
                          }
                          badge={
                            resumeSeries
                              ? heroSeries.badge
                              : getDiscoveryBadge(heroSeries) || heroSeries.badge
                          }
                          className="aspect-[3/4] w-full"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                          {resumeSeries ? "Up next" : "Featured series"}
                        </p>
                        <h2 className="mt-3 font-display text-[1.6rem] font-semibold tracking-tight text-slate-950 sm:text-[1.85rem]">
                          {heroSeries.title}
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {resumeSeries && resumeSpotlight?.episodeId
                            ? `${formatEpisodeLabel(resumeSpotlight.episodeId)}${
                                resumeSpotlight.progressPercent > 0
                                  ? ` is ${formatPercent(
                                      resumeSpotlight.progressPercent,
                                    )} complete.`
                                  : " is ready to reopen."
                              }`
                            : clampText(heroSeries.description, 110) || getReadingState(heroSeries)}
                        </p>

                        {heroSignals.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {heroSignals.slice(0, 2).map((signal) => (
                              <span
                                key={signal}
                                className="rounded-full border border-black/8 bg-[rgba(246,243,237,0.92)] px-3 py-1.5 text-xs font-medium text-slate-700"
                              >
                                {signal}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </section>

        {commerceNotice ? (
          <div className="mb-6">
            <CommerceSuccessBanner
              notice={commerceNotice}
              onDismiss={() => setCommerceNotice(null)}
            />
          </div>
        ) : null}

        {showCatalogFallback ? (
          <section className="mb-8 grid gap-4 md:grid-cols-2">
            {homepageFallbackCards.map((card) => (
              <FallbackDiscoveryCard
                key={card.id}
                eyebrow={card.eyebrow}
                title={card.title}
                description={card.description}
                label={card.label}
                onClick={() => router.push(card.href)}
              />
            ))}
          </section>
        ) : (
          <>
            <HomeShelfSection
              icon={Flame}
              eyebrow="Trending now"
              title="Top Series"
              ctaLabel="Browse top series"
              onCtaClick={() => router.push("/rankings?type=popular&window=week")}
              items={topSeriesItems}
              onItemClick={(item) =>
                openHomeSeries(item.id, "HOME_TOP_SERIES", `home_top_series_${item.id}`)
              }
            />

            <HomeShelfSection
              icon={BookOpenText}
              eyebrow="Free to start"
              title="Start free"
              ctaLabel="Start reading free"
              onCtaClick={() => router.push("/rankings?type=ttf&window=all")}
              items={freeStartItems}
              onItemClick={(item) =>
                openHomeSeries(item.id, "HOME_FREE_START", `home_free_start_${item.id}`)
              }
            />

          </>
        )}

        <section className="mb-6">
          <Card className="overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,246,242,0.96))] py-0 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <CardContent className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Pricing
                </p>
                <h2 className="mt-3 font-display text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.25rem]">
                  One-time packs or a monthly plan.
                </h2>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => router.push("/store")}
                    className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    View point packs
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={() => router.push("/subscribe")}
                    className="h-11 rounded-full border-black/8 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]"
                  >
                    Compare membership
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-black/8 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(49,87,214,0.08)] text-[var(--gush-accent,#3157d6)]">
                    <WalletCards className="size-5" />
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Point packs
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">
                    Use points as needed.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">One-time.</p>
                </div>

                <div className="rounded-[24px] border border-black/8 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(49,87,214,0.08)] text-[var(--gush-accent,#3157d6)]">
                    <BookOpenText className="size-5" />
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Membership
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">
                    Read weekly for less.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Monthly.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

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
            {
              icon: BookOpen,
              text: "Resume chapters and keep your library synced across devices",
            },
            { icon: Gift, text: "Claim daily rewards, mission payouts, and bonus points" },
            {
              icon: Sparkles,
              text: "Get better picks based on what you actually read",
            },
          ]}
        />
      </main>

      <SiteFooter tone="light" variant="compact" pathname="/" />
    </div>
  );
}

export default function HomePage({ initialSearchParams = {}, initialHomeData = null }) {
  return (
    <HomeDataProvider initialData={initialHomeData}>
      <HomeContent initialSearchParams={initialSearchParams} />
    </HomeDataProvider>
  );
}
