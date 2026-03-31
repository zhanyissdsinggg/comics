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
  Gift,
  Sparkles,
} from "lucide-react";
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
} from "../../lib/homeMerchandising";
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import { normalizeGenreList } from "../../lib/coverPresentation";
import { getSearchParam } from "../../lib/pageSearchParams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), { ssr: false });
const CommerceSuccessBanner = dynamic(() => import("../common/CommerceSuccessBanner"));
const SiteHeader = dynamic(() => import("../layout/SiteHeader"), {
  ssr: false,
  loading: () => (
    <div className="sticky top-0 z-40 border-b border-transparent bg-[rgba(251,247,240,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[58px] max-w-[1320px] items-center justify-between gap-3 px-3 py-2 sm:min-h-[64px] sm:px-6 sm:py-2.5 lg:px-8">
        <div className="h-10 w-28 rounded-full bg-white/80 shadow-[0_10px_24px_rgba(15,23,42,0.04)]" />
        <div className="hidden h-10 flex-1 rounded-full bg-white/70 md:block" />
        <div className="h-10 w-24 rounded-full bg-white/80 shadow-[0_10px_24px_rgba(15,23,42,0.04)]" />
      </div>
    </div>
  ),
});
const SiteFooter = dynamic(() => import("../layout/SiteFooter"), {
  ssr: false,
  loading: () => <div className="h-24" aria-hidden="true" />,
});
const HomeContentSections = dynamic(() => import("./HomeContentSections"), {
  ssr: false,
  loading: () => (
    <div className="space-y-8 md:space-y-10">
      <div className="h-56 rounded-[28px] bg-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.05)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`home-section-skeleton-${index}`}
            className="h-72 rounded-[26px] bg-white/78 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
          />
        ))}
      </div>
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
  return !Number.isFinite(numeric) || numeric <= 0
    ? "0%"
    : `${Math.round((numeric <= 1 ? numeric : numeric / 100) * 100)}%`;
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

function getReadingState(series) {
  const completed = String(series?.status || "").toLowerCase() === "completed";
  return completed ? "Completed" : "";
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

function getPrimaryGenres(genres, limit = 2) {
  return normalizeGenreList(genres).slice(0, limit);
}

function formatDisplayLabel(value) {
  const normalized = String(value || "")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function buildHeroCoverAltText(series) {
  const title = String(series?.title || "").replace(/\s+/g, " ").trim();
  const seriesType = String(series?.type || series?.seriesType || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (title && (seriesType === "comic" || seriesType === "novel")) {
    return `${seriesType.charAt(0).toUpperCase()}${seriesType.slice(1)} cover image for ${title}`;
  }

  if (title) {
    return `Cover image for ${title}`;
  }

  if (seriesType === "comic" || seriesType === "novel") {
    return `${seriesType.charAt(0).toUpperCase()}${seriesType.slice(1)} cover image`;
  }

  return "Series cover image";
}

function buildSeriesMetaLabel(series, creatorName) {
  return [creatorName, formatDisplayLabel(series?.type || series?.seriesType || ""), getReadingState(series)]
    .filter(Boolean)
    .join(" · ");
}

function buildHomeShelfItem(series) {
  if (!series?.id) {
    return null;
  }

  const creatorName = resolveSeriesCreatorName(series);

  return {
    id: series.id,
    title: series.title,
    coverUrl: series.coverUrl,
    coverTone: series.coverTone,
    genres: getPrimaryGenres(series?.genres, 1),
    type: series?.type || "",
    seriesType: series?.type || "",
    status: series?.status || "",
    author: creatorName,
    adult: Boolean(series?.adult),
    subtitle: "",
    eyebrow: creatorName,
    statusLabel: "",
    metaLabel: buildSeriesMetaLabel(series, creatorName),
    badge: "",
  };
}

function HeroCoverPreview({ series, eyebrow }) {
  const coverUrl = String(series?.coverUrl || "").trim();
  const badgeLabel = eyebrow || "Featured";
  const coverAltText = buildHeroCoverAltText(series);

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[24px] border border-black/6 bg-neutral-900">
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={coverAltText}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="absolute inset-0 bg-[linear-gradient(135deg,rgba(17,24,39,0.92),rgba(49,87,214,0.38),rgba(245,158,11,0.18))]"
          role="img"
          aria-label={coverAltText}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,15,28,0.16),rgba(10,15,28,0.62))]" />
      <div className="absolute left-3 top-3 rounded-full border border-white/16 bg-[rgba(12,18,30,0.46)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/90 backdrop-blur-sm">
        {badgeLabel}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="line-clamp-2 font-display text-lg font-semibold tracking-tight">
          {series?.title || "Story"}
        </p>
      </div>
    </div>
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
  const heroGenrePills = useMemo(() => getPrimaryGenres(heroSeries?.genres, 2), [heroSeries?.genres]);
  const heroCreatorName = useMemo(
    () => (heroSeries ? resolveSeriesCreatorName(heroSeries) : ""),
    [heroSeries],
  );
  const heroMetaLine = useMemo(
    () => buildSeriesMetaLabel(heroSeries, heroCreatorName),
    [heroCreatorName, heroSeries],
  );

  const heroSignals = useMemo(() => {
    if (!heroSeries) {
      return [];
    }

    const signals = [];

    if (resumeSpotlight?.episodeId) {
      signals.push({
        id: `episode-${resumeSpotlight.episodeId}`,
        content: `${formatEpisodeLabel(resumeSpotlight.episodeId)}${
          resumeSpotlight.progressPercent > 0
            ? ` / ${formatPercent(resumeSpotlight.progressPercent)} complete`
            : ""
        }`,
      });
    }

    const stateLabel = getReadingState(heroSeries);
    if (stateLabel) {
      signals.push({
        id: `state-${String(heroSeries.status || "default").toLowerCase()}`,
        content: stateLabel,
      });
    }

    return signals.filter(Boolean).slice(0, 3);
  }, [heroSeries, resumeSpotlight]);

  const featuredSeriesItems = useMemo(
    () =>
      dedupeSeries([
        editorialSnapshot.breakoutPick,
        editorialSnapshot.completedPick,
        ...editorialSnapshot.safeCatalog,
      ])
        .filter((series) => String(series?.id || "").trim() !== String(heroSeries?.id || "").trim())
        .slice(0, 4)
        .map((series) => buildHomeShelfItem(series))
        .filter(Boolean),
    [editorialSnapshot, heroSeries?.id],
  );

  const startHereItems = useMemo(
    () =>
      dedupeSeries([
        editorialSnapshot.freeStartPick,
        ...(Array.isArray(editorialSnapshot.startHereSeries)
          ? editorialSnapshot.startHereSeries
          : []),
      ])
        .filter((series) => String(series?.id || "").trim() !== String(heroSeries?.id || "").trim())
        .slice(0, 4)
        .map((series) => buildHomeShelfItem(series))
        .filter(Boolean),
    [editorialSnapshot, heroSeries?.id],
  );

  const showCatalogFallback = !loading && !featuredSeries;

  const homepageFallbackCards = useMemo(
    () => [
      {
        id: "featured-series",
        eyebrow: "Featured Series",
        title: "Start with featured stories",
        description: "A smaller editorial shelf when you want a confident place to begin.",
        label: "Browse series",
        href: "/search",
      },
      {
        id: "browse-comics",
        eyebrow: "Browse by Format",
        title: "Choose your format",
        description: "Jump straight into comics or prose, depending on how you want to read today.",
        label: "Browse comics",
        href: "/comics",
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

  const openHeroCardCta = () => {
    if (!heroSeries?.id) {
      return;
    }

    if (resumeSeries) {
      goResume();
      return;
    }

    openHomeSeries(heroSeries.id, "HOME_HERO_CARD", `home_hero_card_${heroSeries.id}`);
  };

  const openPrimaryHeroCta = () => {
    if (resumeSeries) {
      goResume();
      return;
    }

    openHeroCardCta();
  };

  const heroCardLabel = resumeSeries ? "Pick up where you left off" : "Featured right now";
  const heroPrimaryCtaLabel = resumeSeries ? "Continue Reading" : "Start Reading";
  const heroCardCtaLabel = resumeSeries ? "Continue Reading" : "View Series";
  return (
    <div className="gush-page-shell overflow-hidden">
      <div className="gush-page-ambient h-[clamp(21rem,42vw,34rem)]" />
      <SiteHeader variant="home" />

      <main className="gush-page-main gush-page-main--wide">
        <section className="pb-8 pt-2 md:pb-10">
          {loading ? (
            <div className="aspect-[5/6] w-full animate-pulse rounded-[36px] bg-white/80 shadow-[0_20px_44px_rgba(15,23,42,0.06)] sm:aspect-[21/11] lg:aspect-[21/8]" />
          ) : (
            <Card className="relative overflow-hidden rounded-[36px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,243,236,0.95))] py-0 shadow-[0_28px_70px_rgba(15,23,42,0.08)]">
              {featuredBannerUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
                  style={{ backgroundImage: `url(${featuredBannerUrl})` }}
                />
              ) : null}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(49,87,214,0.1),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(27,36,64,0.06),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(247,243,236,0.96))]" />

              <CardContent className="relative grid gap-8 p-5 sm:p-7 xl:grid-cols-[1.08fr_0.92fr] xl:items-end xl:p-10">
                <div className="max-w-2xl pb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Original comics and serialized fiction
                  </p>
                  <h1 className="mt-4 max-w-3xl font-display text-[2.4rem] font-semibold leading-[0.98] tracking-[-0.04em] text-slate-950 sm:text-[3.3rem] xl:text-[4.2rem]">
                    Read original comics and novels in one place.
                  </h1>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                    Curated stories, cleaner shelves, and a calmer way to keep reading.
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      size="lg"
                      onClick={openPrimaryHeroCta}
                      className="h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      {heroPrimaryCtaLabel}
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => router.push("/comics")}
                      className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-slate-600 hover:bg-transparent hover:text-slate-950"
                    >
                      Browse Comics
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => router.push("/novels")}
                      className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-slate-600 hover:bg-transparent hover:text-slate-950"
                    >
                      Browse Novels
                    </Button>
                  </div>
                </div>

                {heroSeries ? (
                  <div className="rounded-[30px] border border-black/8 bg-[rgba(255,255,255,0.86)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.055)] backdrop-blur-[10px] sm:p-5">
                    <div className="grid grid-cols-[110px_1fr] gap-4 sm:grid-cols-[148px_1fr] sm:items-start">
                      <div className="overflow-hidden rounded-[24px] border border-black/6 bg-neutral-900 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
                        <HeroCoverPreview
                          series={heroSeries}
                          eyebrow={resumeSeries ? "Continue Reading" : "Featured"}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                          {heroCardLabel}
                        </p>
                        <h2 className="mt-3 font-display text-[1.7rem] font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                          {heroSeries.title}
                        </h2>

                        {heroMetaLine ? (
                          <p className="mt-3 text-[12px] font-medium tracking-[0.08em] text-slate-500">
                            {heroMetaLine}
                          </p>
                        ) : null}

                        <p className="mt-3 text-sm leading-7 text-slate-600">
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

                        {heroGenrePills.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2.5">
                            {heroGenrePills.map((genre) => (
                              <span
                                key={`hero-genre-${genre}`}
                                className="inline-flex items-center whitespace-nowrap rounded-full border border-black/6 bg-white/92 px-3 py-1 text-xs font-medium text-slate-600"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {heroSignals.length > 0 ? (
                          <div className={`flex flex-wrap gap-2 ${heroGenrePills.length > 0 ? "mt-2" : "mt-4"}`}>
                            {heroSignals.slice(0, 2).map((signal) => (
                              <span
                                key={signal.id}
                                className="rounded-full border border-black/8 bg-[rgba(246,243,237,0.92)] px-3 py-1.5 text-xs font-medium text-slate-700"
                              >
                                {signal.content}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={openHeroCardCta}
                          className="mt-5 h-auto justify-start rounded-full px-0 py-0 text-sm font-semibold text-[var(--gush-accent,#3157d6)] hover:bg-transparent hover:text-[var(--gush-accent-strong,#2444af)]"
                        >
                          {heroCardCtaLabel}
                          <ArrowRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </section>

        {commerceNotice ? (
          <div className="mb-8 md:mb-10">
            <CommerceSuccessBanner
              notice={commerceNotice}
              onDismiss={() => setCommerceNotice(null)}
            />
          </div>
        ) : null}

        <HomeContentSections
          showCatalogFallback={showCatalogFallback}
          homepageFallbackCards={homepageFallbackCards}
          featuredSeriesItems={featuredSeriesItems}
          startHereItems={startHereItems}
          onFallbackClick={(href) => router.push(href)}
          onBrowseAllSeries={() => router.push("/search")}
          onFeaturedItemClick={(item) =>
            openHomeSeries(item.id, "HOME_FEATURED_SERIES", `home_featured_series_${item.id}`)
          }
          onStartHereItemClick={(item) =>
            openHomeSeries(item.id, "HOME_START_HERE", `home_start_here_${item.id}`)
          }
          onGuideClick={(href) => router.push(href)}
        />

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

      <SiteFooter
        tone="light"
        variant="compact"
        pathname="/"
        taglineOverride="Browse original comics and serialized fiction without the clutter."
      />
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
