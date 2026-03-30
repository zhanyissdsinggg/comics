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
  Gift,
  CircleHelp,
  Sparkles,
  Users,
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
} from "../../lib/homeMerchandising";
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import { normalizeGenreList } from "../../lib/coverPresentation";
import { getSearchParam } from "../../lib/pageSearchParams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

function HomeSectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description = "",
  ctaLabel,
  onCtaClick,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-black/6 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {Icon ? <Icon className="size-3.5" /> : null}
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-3 font-display text-[1.72rem] font-semibold tracking-tight text-slate-950 sm:text-[2.1rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
        ) : null}
      </div>

      {ctaLabel && typeof onCtaClick === "function" ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onCtaClick}
          className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-slate-600 hover:bg-transparent hover:text-slate-950"
        >
          {ctaLabel}
          <ArrowRight className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

function FallbackDiscoveryCard({ eyebrow, title, description, label, onClick }) {
  return (
    <Card className="overflow-hidden rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,243,236,0.95))] py-0 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <CardContent className="p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-[1.75rem] font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">{description}</p>
        <Button
          type="button"
          variant="ghost"
          onClick={onClick}
          className="mt-5 h-auto rounded-full px-0 py-0 text-sm font-semibold text-slate-700 hover:bg-transparent hover:text-slate-950"
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
  description = "",
  ctaLabel,
  onCtaClick,
  items,
  onItemClick,
  actionLabel = "View Series",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6 md:space-y-7">
      <HomeSectionHeader
        icon={Icon}
        eyebrow={eyebrow}
        title={title}
        description={description}
        ctaLabel={ctaLabel}
        onCtaClick={onCtaClick}
      />

      <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.id}>
            <PortraitCard
              item={item}
              tone={item.coverTone}
              appearance="light"
              actionLabel={actionLabel}
              onClick={() => onItemClick?.(item)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeGuideCard({ icon: Icon, eyebrow, title, description, ctaLabel, onClick }) {
  return (
    <Card className="h-full overflow-hidden rounded-[28px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,238,0.94))] py-0 shadow-[0_14px_30px_rgba(15,23,42,0.045)]">
      <CardContent className="flex h-full flex-col p-5 sm:p-6">
        <div className="flex size-11 items-center justify-center rounded-[18px] border border-black/6 bg-white/90 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <Icon className="size-5" />
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {eyebrow}
        </p>
        <h3 className="mt-2 font-display text-[1.3rem] font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{description}</p>
        <Button
          type="button"
          variant="ghost"
          onClick={onClick}
          className="mt-5 h-auto justify-start rounded-full px-0 py-0 text-sm font-semibold text-slate-700 hover:bg-transparent hover:text-slate-950"
        >
          {ctaLabel}
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
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
  const homeGuideCards = [
    {
      id: "guide-comics",
      icon: BookOpenText,
      eyebrow: "Format",
      title: "Comics",
      description: "Panel-led stories with a crisp reading rhythm and strong visual pacing.",
      ctaLabel: "Browse Comics",
      onClick: () => router.push("/comics"),
    },
    {
      id: "guide-novels",
      icon: BookOpen,
      eyebrow: "Format",
      title: "Novels",
      description: "Serialized prose built for quieter sessions and chapter-by-chapter momentum.",
      ctaLabel: "Browse Novels",
      onClick: () => router.push("/novels"),
    },
    {
      id: "guide-creators",
      icon: Users,
      eyebrow: "Creators",
      title: "Meet the creators",
      description: "Explore the writers, artists, teams, and studios shaping each story world.",
      ctaLabel: "View Creators",
      onClick: () => router.push("/creators"),
    },
    {
      id: "guide-help",
      icon: CircleHelp,
      eyebrow: "Help",
      title: "Need help?",
      description: "Find support for reading, accounts, and content settings without digging around.",
      ctaLabel: "Get Help",
      onClick: () => router.push("/support"),
    },
  ];
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
                    Stories worth settling into.
                  </h1>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                    Original comics and serialized novels, curated for calmer reading.
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
                        <Cover
                          tone={heroSeries.coverTone}
                          coverUrl={heroSeries.coverUrl}
                          label={heroSeries.title}
                          genres={heroSeries.genres}
                          seriesType={heroSeries.type}
                          eyebrow={resumeSeries ? "Continue Reading" : "Featured"}
                          badge=""
                          className="aspect-[3/4] w-full"
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

        <div className="space-y-12 md:space-y-16">
          {showCatalogFallback ? (
            <section className="grid gap-5 md:grid-cols-2">
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
                eyebrow="Editorial picks for right now"
                title="Featured series"
                description="A tighter shelf of current standouts, selected for strong starts and lasting momentum."
                ctaLabel="Browse all series"
                onCtaClick={() => router.push("/search")}
                items={featuredSeriesItems}
                actionLabel="View Series"
                onItemClick={(item) =>
                  openHomeSeries(item.id, "HOME_FEATURED_SERIES", `home_featured_series_${item.id}`)
                }
              />

              <HomeShelfSection
                icon={BookOpenText}
                eyebrow="A quieter first step"
                title="Start here"
                description="Reader-friendly picks when you want a confident entry point instead of a crowded catalog."
                items={startHereItems}
                actionLabel="Read Chapter 1"
                onItemClick={(item) =>
                  openHomeSeries(item.id, "HOME_START_HERE", `home_start_here_${item.id}`)
                }
              />
            </>
          )}

          <section className="space-y-6 md:space-y-7">
            <HomeSectionHeader
              eyebrow="Choose your reading pace"
              title="Browse by format"
              description="Move from formats to creators and support without breaking the calm of the page."
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {homeGuideCards.map((card) => (
                <HomeGuideCard
                  key={card.id}
                  icon={card.icon}
                  eyebrow={card.eyebrow}
                  title={card.title}
                  description={card.description}
                  ctaLabel={card.ctaLabel}
                  onClick={card.onClick}
                />
              ))}
            </div>
          </section>
        </div>

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
