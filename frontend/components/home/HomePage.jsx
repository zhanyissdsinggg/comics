/**
 * Home page shell: hero, quick return, discovery shortcuts, and live shelves.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BookOpen, Compass, Gift, Search, Sparkles, Star } from "lucide-react";
import { HomeDataProvider, useHomeData } from "./HomeDataProvider";
import { useFollowStore } from "../../store/useFollowStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useProgressStore } from "../../store/useProgressStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useBrandingStore } from "../../store/useBrandingStore";
import { trackEvent } from "../../lib/trackEvent";
import { siteConfig } from "../../lib/siteConfig";
import { consumeCommerceSuccessForPath, getCommerceSuccessPresentation } from "../../lib/commerceSuccess";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import { buildHomeHeroItems, getHomeEditorialSnapshot, getSeriesScore } from "../../lib/homeMerchandising";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const LoginPrompt = dynamic(() => import("../auth/LoginPrompt"), { ssr: false });
const CommerceSuccessBanner = dynamic(() => import("../common/CommerceSuccessBanner"));
const SiteHeader = dynamic(() => import("../layout/SiteHeader"), {
  ssr: false,
  loading: () => <div className="sticky top-0 z-40 h-[72px] border-b border-white/5 bg-neutral-950/90" />,
});
const HeroCarousel = dynamic(() => import("./HeroCarousel"), {
  loading: () => <div className="aspect-[21/9] w-full animate-pulse rounded-[32px] bg-neutral-800 sm:aspect-[21/8] md:aspect-[21/7]" />,
});
const HomeRailsContainer = dynamic(() => import("./HomeRailsContainer"), {
  loading: () => <div className="space-y-10"><div className="h-72 rounded-[28px] bg-neutral-900/60" /><div className="h-72 rounded-[28px] bg-neutral-900/60" /></div>,
});

const GENRE_CHIPS = [
  { id: "all", label: "All" }, { id: "action", label: "Action" }, { id: "romance", label: "Romance" },
  { id: "fantasy", label: "Fantasy" }, { id: "drama", label: "Drama" }, { id: "thriller", label: "Thriller" },
  { id: "comedy", label: "Comedy" }, { id: "sci-fi", label: "Sci-Fi" }, { id: "horror", label: "Horror" },
];

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

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { followedSeriesIds, loadFollowed } = useFollowStore();
  const { items: historyItems, loadHistory } = useHistoryStore();
  const { bySeriesId: progressMap, loadProgress } = useProgressStore();
  const { isSignedIn } = useAuthStore();
  const { branding } = useBrandingStore();
  const { loading, seriesList, hotKeywords, homepageSlots } = useHomeData();
  const [activeGenre, setActiveGenre] = useState("all");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [commerceNotice, setCommerceNotice] = useState(null);

  useEffect(() => { if (isSignedIn) { loadFollowed(); loadHistory(); loadProgress(); } }, [isSignedIn, loadFollowed, loadHistory, loadProgress]);
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
  useEffect(() => { trackEvent("view_home", {}); }, []);
  useEffect(() => { setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/"))); }, []);

  const heroItems = useMemo(() => buildHomeHeroItems(seriesList, { bannerUrl: branding?.homeBannerUrl, homepageSlots }), [branding?.homeBannerUrl, homepageSlots, seriesList]);
  const editorialSnapshot = useMemo(() => getHomeEditorialSnapshot(seriesList, { homepageSlots }), [homepageSlots, seriesList]);
  const seriesById = useMemo(() => new Map(seriesList.map((series) => [series.id, series])), [seriesList]);
  const progressEntries = useMemo(() => Object.entries(progressMap || {}).sort(([, l], [, r]) => toTimestamp(r?.updatedAt) - toTimestamp(l?.updatedAt)), [progressMap]);
  const continueItems = useMemo(() => progressEntries.map(([seriesId, progress]) => {
    const series = seriesById.get(seriesId);
    return !series || !progress?.lastEpisodeId ? null : { seriesId, episodeId: progress.lastEpisodeId, progressPercent: Number(progress.percent || 0) };
  }).filter(Boolean), [progressEntries, seriesById]);
  const recentHistoryItems = useMemo(() => (Array.isArray(historyItems) ? historyItems : []).map((entry) => {
    const series = seriesById.get(entry?.seriesId);
    return !series || !entry?.episodeId ? null : { seriesId: entry.seriesId, episodeId: entry.episodeId, updatedAt: toTimestamp(entry.createdAt) };
  }).filter(Boolean).sort((l, r) => r.updatedAt - l.updatedAt), [historyItems, seriesById]);
  const resumeSpotlight = continueItems[0] || recentHistoryItems[0] || null;
  const resumeSeries = resumeSpotlight ? seriesById.get(resumeSpotlight.seriesId) || null : null;
  const quickSearchSignals = useMemo(() => (Array.isArray(hotKeywords) ? hotKeywords.filter(Boolean).slice(0, 6) : []).map((item, index) => typeof item === "string" ? ({ id: `${item}-${index}`, label: item, hint: "Trending search" }) : ({ id: `${item.keyword || item.label || "keyword"}-${index}`, label: item.keyword || item.label || "Trending", hint: item.growthLabel || item.badge || (typeof item.count === "number" ? `${item.count.toLocaleString()} searches` : "Trending search") })), [hotKeywords]);
  const leaderboardItems = useMemo(() => {
    const seen = new Set();
    return [editorialSnapshot.breakoutPick, editorialSnapshot.freeStartPick, editorialSnapshot.completedPick, ...editorialSnapshot.safeCatalog]
      .filter(Boolean)
      .filter((series) => {
        const id = String(series?.id || "").trim();
        if (!id || seen.has(id)) { return false; }
        seen.add(id);
        return true;
      })
      .map((series) => {
        const badges = [series?.badge, ...(Array.isArray(series?.badges) ? series.badges : [])].filter(Boolean).map((badge) => String(badge).trim().toUpperCase());
        const hasFree = Boolean(series?.hasFreeEpisodes || Number(series?.freeEpisodeCount) > 0);
        const completed = String(series?.status || "").toLowerCase() === "completed";
        return { id: series.id, title: series.title, coverUrl: series.coverUrl, badge: badges[0] || null, statusLabel: hasFree ? `${Number(series?.freeEpisodeCount || 0)} free eps` : completed ? "Completed" : "Weekly return", meta: Array.isArray(series?.genres) && series.genres.length > 0 ? series.genres.slice(0, 2).join(" / ") : "Official release", score: getSeriesScore(series) + (hasFree ? 90 : 0) + (completed ? 70 : 0) + (badges.includes("HOT") ? 140 : 0) + (badges.includes("NEW") ? 90 : 0) };
      }).sort((l, r) => r.score - l.score).slice(0, 5);
  }, [editorialSnapshot]);

  const goResume = () => {
    if (!resumeSpotlight?.seriesId) { router.push("/library"); return; }
    const targetPath = resumeSpotlight.episodeId ? `/read/${resumeSpotlight.seriesId}/${resumeSpotlight.episodeId}` : `/series/${resumeSpotlight.seriesId}`;
    router.push(buildPathWithAttribution(targetPath, { entryPoint: "HOME_RETURN_LANE", campaignId: "resume_spotlight", sourcePath: "/", sourceSeriesId: resumeSpotlight.seriesId, sourceEpisodeId: resumeSpotlight.episodeId || undefined, returnTo: targetPath }));
  };

  return (
    <div className="min-h-screen bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-[1320px] px-4 pb-24 sm:px-6 sm:pb-10 lg:px-8">
        <section className="py-4 md:py-6">
          {loading ? <div className="aspect-[21/9] w-full animate-pulse rounded-[32px] bg-neutral-800 sm:aspect-[21/8] md:aspect-[21/7]" /> : <HeroCarousel items={heroItems} />}
        </section>

        {commerceNotice ? <div className="mb-8"><CommerceSuccessBanner notice={commerceNotice} onDismiss={() => setCommerceNotice(null)} /></div> : null}

        {isSignedIn && resumeSeries ? (
          <section className="mb-10">
            <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,14,22,0.98))] py-0 shadow-[0_26px_90px_rgba(0,0,0,0.28)]">
              <CardContent className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">Continue reading</p>
                  <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Jump back into {resumeSeries.title}.</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-200 sm:text-base">
                    {resumeSpotlight?.progressPercent > 0 ? `${formatEpisodeLabel(resumeSpotlight.episodeId)} is ${formatPercent(resumeSpotlight.progressPercent)} complete.` : `${formatEpisodeLabel(resumeSpotlight?.episodeId)} is still the fastest way back into the story.`}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[["Continue", continueItems.length], ["History", recentHistoryItems.length], ["Following", followedSeriesIds.length]].map(([label, value], index) => (
                      <span key={String(label)} className={`rounded-full border px-3 py-1.5 text-sm ${index === 0 ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-100" : "border-white/10 bg-white/[0.04] text-neutral-200"}`}>
                        <span className="font-semibold text-white">{Number(value).toLocaleString()}</span>
                        <span className="ml-2 text-neutral-400">{label}</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button type="button" size="lg" onClick={goResume} className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200">Continue {formatEpisodeLabel(resumeSpotlight?.episodeId)}</Button>
                    <Button type="button" size="lg" variant="outline" onClick={() => router.push(`/series/${resumeSeries.id}`)} className="h-11 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]">Open series page</Button>
                    <Button type="button" size="lg" variant="outline" onClick={() => router.push("/library")} className="h-11 rounded-full border-white/10 bg-black/20 px-5 text-sm font-semibold text-neutral-200 hover:border-white/20 hover:bg-white/[0.06]">Open library</Button>
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-[148px_1fr]">
                    <div className="aspect-[3/4] rounded-[24px] border border-white/10 bg-neutral-900 bg-cover bg-center shadow-[0_20px_50px_rgba(0,0,0,0.22)]" style={resumeSeries.coverUrl ? { backgroundImage: `linear-gradient(180deg,rgba(12,18,24,0.04),rgba(12,18,24,0.24)), url(${resumeSeries.coverUrl})` } : undefined} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">Up next</p>
                      <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">{resumeSeries.title}</h3>
                      <p className="mt-3 text-sm text-neutral-300">{formatEpisodeLabel(resumeSpotlight?.episodeId)}{resumeSpotlight?.progressPercent > 0 ? ` / ${formatPercent(resumeSpotlight.progressPercent)} complete` : " / Ready to reopen"}</p>
                      {Array.isArray(resumeSeries.genres) && resumeSeries.genres.length > 0 ? <p className="mt-2 text-sm text-neutral-400">{resumeSeries.genres.slice(0, 3).join(" / ")}</p> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {resumeSeries.badge ? <Badge variant="outline" className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white">{resumeSeries.badge}</Badge> : null}
                        {followedSeriesIds.includes(resumeSeries.id) ? <Badge variant="outline" className="rounded-full border-emerald-400/20 bg-emerald-400/[0.1] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-200">Following</Badge> : null}
                        {resumeSeries.status ? <Badge variant="outline" className="rounded-full border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-300">{resumeSeries.status}</Badge> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section className="mb-12 grid gap-4 xl:grid-cols-[0.96fr_1.04fr] xl:items-start">
          <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,14,22,0.98))] py-0 shadow-[0_26px_90px_rgba(0,0,0,0.28)]">
            <CardContent className="p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">Discover now</p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-[2.2rem]">Pick a lane and keep moving.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-300">Free starts, completed runs, and genre filters should all be close enough to feel effortless.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button type="button" onClick={() => router.push("/rankings?type=ttf&window=all")} className="h-10 rounded-full bg-white px-4 text-sm font-semibold text-neutral-950 hover:bg-neutral-200">Start free</Button>
                <Button type="button" variant="outline" onClick={() => router.push("/search?status=Completed&sort=popular")} className="h-10 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]">Browse completed</Button>
                <Button type="button" variant="outline" onClick={() => router.push("/rankings?type=popular&window=week")} className="h-10 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]">Weekly chart</Button>
              </div>
              <Separator className="my-6 bg-white/10" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Browse by genre</p>
                  <p className="mt-1 text-sm text-neutral-400">Use a quick genre switch, then let the shelves below do the rest.</p>
                </div>
                <Badge variant="outline" className="rounded-full border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-300">{GENRE_CHIPS.find((chip) => chip.id === activeGenre)?.label || "All"} active</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {GENRE_CHIPS.map((chip) => {
                  const active = activeGenre === chip.id;
                  return <Button key={chip.id} type="button" variant={active ? "default" : "outline"} onClick={() => setActiveGenre(chip.id)} className={`h-10 rounded-full px-4 text-sm font-semibold ${active ? "bg-white text-neutral-950 hover:bg-neutral-200" : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"}`}>{chip.label}</Button>;
                })}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {[["Free starts", editorialSnapshot.freeStartSeriesCount], ["Completed", editorialSnapshot.completedSeriesCount], ["Catalog", editorialSnapshot.seriesCount]].map(([label, value], index) => (
                  <span key={String(label)} className={`rounded-full border px-3 py-1.5 text-sm ${index === 0 ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-100" : "border-white/10 bg-white/[0.04] text-neutral-200"}`}>
                    <span className="font-semibold text-white">{Number(value).toLocaleString()}</span>
                    <span className="ml-2 text-neutral-400">{label}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,14,22,0.98))] py-0 shadow-[0_26px_90px_rgba(0,0,0,0.28)]">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">This week</p>
                  <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-[2.15rem]">Chart leaders and search heat.</h2>
                  <p className="mt-3 text-sm leading-7 text-neutral-300">The homepage should surface what is moving right now before readers commit their time.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => router.push("/rankings?type=popular&window=week")} className="h-11 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"><Star className="size-4" />Open full chart</Button>
              </div>
              <div className="mt-6 space-y-3">
                {leaderboardItems.map((item, index) => (
                  <button key={item.id} type="button" onClick={() => router.push(buildPathWithAttribution(`/series/${item.id}`, { entryPoint: "HOME_LEADERBOARD", campaignId: "homepage_leaderboard", sourcePath: "/", sourceSeriesId: item.id, returnTo: `/series/${item.id}` }))} className="group flex w-full items-center gap-3 rounded-[24px] border border-white/8 bg-black/20 p-3 text-left transition hover:border-white/18 hover:bg-white/[0.04]">
                    <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] py-2"><span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">No.</span><span className="mt-1 text-lg font-semibold text-white">{String(index + 1).padStart(2, "0")}</span></div>
                    <div className="h-20 w-14 shrink-0 rounded-[16px] border border-white/10 bg-neutral-900 bg-cover bg-center" style={item.coverUrl ? { backgroundImage: `linear-gradient(180deg,rgba(9,12,18,0.02),rgba(9,12,18,0.2)), url(${item.coverUrl})` } : undefined} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.badge ? <Badge variant="outline" className="rounded-full border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-200">{item.badge}</Badge> : null}
                        <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/80">{item.statusLabel}</span>
                      </div>
                      <h3 className="mt-2 truncate text-base font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 truncate text-sm text-neutral-400">{item.meta}</p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-white" />
                  </button>
                ))}
              </div>
              <Separator className="my-6 bg-white/10" />
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Trending searches</p>
                  <p className="mt-1 text-sm text-neutral-400">Use live search shortcuts when you already know the mood you want.</p>
                </div>
                <Button type="button" variant="ghost" onClick={() => router.push("/search")} className="h-10 justify-start gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.06]"><Search className="size-4" />Explore search</Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {quickSearchSignals.length > 0 ? quickSearchSignals.map((keyword) => (
                  <Button key={keyword.id} type="button" variant="outline" onClick={() => router.push(`/search?q=${encodeURIComponent(keyword.label)}`)} className="h-auto rounded-[22px] border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:border-white/20 hover:bg-white/[0.08]">
                    <span className="block text-sm font-semibold text-white">{keyword.label}</span>
                    <span className="mt-1 block text-[11px] uppercase tracking-[0.2em] text-neutral-500">{keyword.hint}</span>
                  </Button>
                )) : <Card className="w-full rounded-[24px] border border-white/10 bg-black/20 py-0 shadow-none"><CardContent className="p-4 text-sm text-neutral-400">Trending searches are still loading.</CardContent></Card>}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">{siteConfig.siteName} shelves</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-[2.2rem]">More ways to keep reading.</h2>
            <p className="mt-3 text-sm leading-7 text-neutral-300">Scroll the live shelves, filter by genre, and move deeper without extra explanation blocks getting in the way.</p>
          </div>
          <Button type="button" size="lg" variant="outline" onClick={() => router.push("/search")} className="h-11 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"><Compass className="size-4" />Browse all series</Button>
        </section>

        {loading ? <div className="space-y-10"><div className="h-72 rounded-[28px] bg-neutral-900/60" /><div className="h-72 rounded-[28px] bg-neutral-900/60" /></div> : <HomeRailsContainer activeGenre={activeGenre} onResetGenre={() => setActiveGenre("all")} />}

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
