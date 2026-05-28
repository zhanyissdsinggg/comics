"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Flame, Library, Sparkles } from "lucide-react";
import { HomeDataProvider, useHomeData } from "../home/HomeDataProvider";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useProgressStore } from "../../store/useProgressStore";
import { trackEvent } from "../../lib/trackEvent";
import {
  CoverCard,
  EmptyShelf,
  InteractivePromo,
  SectionHeading,
  ShelfScroller,
  StorefrontPage,
  StoryHero,
  UpdateList,
} from "./StorefrontScaffold";
import {
  buildCompletedRail,
  buildContinueReadingItems,
  buildGenreLabel,
  buildLatestInstallmentLabel,
  buildPopularRail,
  buildReadHref,
  buildStatusLabel,
  buildUpdatedRail,
  pickFeaturedSeries,
} from "./landingUtils";

function HomeLandingContent({ initialHomeData = null }) {
  const { seriesList, loading } = useHomeData();
  const { isSignedIn } = useAuthStore();
  const { bySeriesId, loadProgress } = useProgressStore();
  const featuredSeriesId = String(
    initialHomeData?.canonicalHome?.featuredSeriesId || "",
  ).trim();

  useEffect(() => {
    trackEvent("home_view", {
      sourceSection: "home_page",
    });
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      void loadProgress();
    }
  }, [isSignedIn, loadProgress]);

  const homeModel = useMemo(() => {
    const featured = pickFeaturedSeries(seriesList, featuredSeriesId);
    const featuredId = String(featured?.id || "").trim();
    const popularPool = buildPopularRail(seriesList, 16).filter(
      (series) => String(series?.id || "").trim() !== featuredId,
    );
    const trending = popularPool.slice(0, 10);
    const trendingIds = new Set(trending.map((series) => String(series?.id || "").trim()));
    const updates = buildUpdatedRail(seriesList, 14).filter(
      (series) =>
        String(series?.id || "").trim() !== featuredId &&
        !trendingIds.has(String(series?.id || "").trim()),
    );
    const continueItems = buildContinueReadingItems(seriesList, bySeriesId).slice(0, 8);
    const continueIds = new Set(
      continueItems.map((series) => String(series?.id || "").trim()),
    );
    const completed = buildCompletedRail(seriesList, 12).filter(
      (series) =>
        String(series?.id || "").trim() !== featuredId &&
        !continueIds.has(String(series?.id || "").trim()),
    );
    const romancePick =
      trending.find((series) =>
        Array.isArray(series?.genres)
          ? series.genres.some((genre) =>
              String(genre || "").trim().toLowerCase().includes("romance"),
            )
          : false,
      ) ||
      popularPool.find((series) =>
        Array.isArray(series?.genres)
          ? series.genres.some((genre) =>
              String(genre || "").trim().toLowerCase().includes("romance"),
            )
          : false,
      ) ||
      featured;
    const darkFantasyPick =
      trending.find((series) =>
        Array.isArray(series?.genres)
          ? series.genres.some((genre) =>
              ["fantasy", "horror", "supernatural", "thriller"].includes(
                String(genre || "").trim().toLowerCase(),
              ),
            )
          : false,
      ) ||
      popularPool.find((series) =>
        Array.isArray(series?.genres)
          ? series.genres.some((genre) =>
              ["fantasy", "horror", "supernatural", "thriller"].includes(
                String(genre || "").trim().toLowerCase(),
              ),
            )
          : false,
      ) ||
      featured;
    const latestTapPick = updates[0] || trending[0] || featured;
    const heatSignals = [
      {
        label: "Most opened tonight",
        series: trending[0] || featured,
        body: "Readers keep opening this one first and staying for the cliffhanger.",
      },
      {
        label: "Readers are starting here",
        series: featured || trending[1] || trending[0],
        body: "A fast first chapter, a strong hook, and an easy place to fall in.",
      },
      {
        label: "Trending in romance",
        series: romancePick,
        body: "Slow burns, messy feelings, and the chapter people keep texting about.",
      },
      {
        label: "Trending in dark fantasy",
        series: darkFantasyPick,
        body: "Shadowy kingdoms, bad choices, and the route readers keep chasing.",
      },
      {
        label: "New chapters people keep tapping",
        series: latestTapPick,
        body: "Fresh updates are landing here before the rest of the shelf catches up.",
      },
    ].filter((item) => item.series);

    return {
      featured,
      trending,
      updates: updates.slice(0, 8),
      continueItems,
      completed: completed.slice(0, 8),
      heatSignals,
    };
  }, [bySeriesId, featuredSeriesId, seriesList]);

  const featuredStats = homeModel.featured
    ? [
        {
          label: "Latest",
          value: buildLatestInstallmentLabel(homeModel.featured),
        },
        {
          label: "Shelf",
          value: buildStatusLabel(homeModel.featured),
        },
        {
          label: "Genres",
          value: buildGenreLabel(homeModel.featured, 2) || "Trending",
        },
      ]
    : [];

  return (
    <StorefrontPage>
      {homeModel.featured ? (
        <StoryHero
          series={homeModel.featured}
          eyebrow="Featured Today"
          hook="Open a story you'll keep thinking about."
          primaryLabel="Start Reading"
          primaryTestId="home-hero-primary-cta"
          primaryHref={
            initialHomeData?.canonicalHome?.featuredReadHref ||
            buildReadHref(homeModel.featured)
          }
          secondaryLabel="View Series"
          stats={featuredStats}
          chips={(Array.isArray(homeModel.featured?.genres)
            ? homeModel.featured.genres
            : []
          ).slice(0, 3)}
        />
      ) : loading ? null : (
        <EmptyShelf
          title="The front page is getting ready"
          description="New stories will land here as soon as they go live in this mode."
          actionHref="/search"
        />
      )}

      {homeModel.heatSignals.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Readers Right Now"
            title="What people are opening tonight"
            description="A fast look at the titles getting opened, passed around, and started first."
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {homeModel.heatSignals.map((item, index) => (
              <Link
                key={`${item.label}-${item.series.id}`}
                href={`/series/${item.series.id}`}
                className="group rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--gush-shadow-panel)] transition-all duration-150 hover:-translate-y-0.5 hover:border-white/16 hover:bg-[rgba(255,255,255,0.06)]"
                onClick={() =>
                  trackEvent("story_click", {
                    seriesId: item.series?.id,
                    sourceSection: "home_heat_signals",
                    position: index + 1,
                  })
                }
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/52">
                  {item.label}
                </p>
                <h3 className="mt-3 text-lg font-semibold leading-[1.02] tracking-[-0.018em] text-white">
                  {item.series.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  {buildGenreLabel(item.series, 2) || "Reader favorite"}
                </p>
                <p className="mt-3 text-sm leading-6 text-white/74">
                  {item.body}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {homeModel.trending.length > 0 ? (
      <section className="space-y-4">
        <SectionHeading
          eyebrow="Trending Covers"
          title="Most opened tonight"
          description="The covers readers keep opening tonight."
        />
          <ShelfScroller>
            {homeModel.trending.map((series, index) => (
              <CoverCard
                key={series.id}
                series={series}
                href={`/series/${series.id}`}
                badge={`#${index + 1}`}
                actionLabel={buildLatestInstallmentLabel(series)}
                onClick={() =>
                  trackEvent("story_click", {
                    seriesId: series?.id,
                    sourceSection: "home_trending_covers",
                    position: index + 1,
                  })
                }
              />
            ))}
          </ShelfScroller>
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeading
          eyebrow="New Episodes Today"
          title="New chapters people keep tapping"
          description="Fresh drops, quick catch-ups, and the updates readers are opening first."
        />
        {homeModel.updates.length > 0 ? (
          <UpdateList items={homeModel.updates} sectionName="home_new_episodes" />
        ) : (
          <EmptyShelf
            title="No new drops yet"
            description="Fresh chapters will show up here as soon as today's drops are in."
            actionHref="/comics"
          />
        )}
      </section>

      {homeModel.continueItems.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Continue Reading"
            title="Right where you left it"
            description="Pick up right where you stopped."
            action={
              <Link
                href="/library"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/76"
              >
                <Library className="size-4" />
                Open Library
              </Link>
            }
          />
          <ShelfScroller>
            {homeModel.continueItems.map((series, index) => (
              <CoverCard
                key={series.id}
                series={series}
                href={`/read/${series.id}/${series.resumeEpisodeId}`}
                actionLabel="Continue Reading"
                progressPercent={series.progressPercent}
                badge="Resume"
                onClick={() =>
                  trackEvent("story_click", {
                    seriesId: series?.id,
                    sourceSection: "home_continue_reading",
                    position: index + 1,
                  })
                }
              />
            ))}
          </ShelfScroller>
        </section>
      ) : null}

      {homeModel.completed.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Binge-worthy Completed"
            title="Whole stories, zero waiting"
            description="Finished stories with no waiting."
          />
          <ShelfScroller>
            {homeModel.completed.map((series, index) => (
              <CoverCard
                key={series.id}
                series={series}
                href={`/series/${series.id}`}
                badge="Completed"
                actionLabel="Read Full Series"
                onClick={() =>
                  trackEvent("story_click", {
                    seriesId: series?.id,
                    sourceSection: "home_completed",
                    position: index + 1,
                  })
                }
              />
            ))}
          </ShelfScroller>
        </section>
      ) : null}

      <InteractivePromo />

      <section className="rounded-[30px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5 shadow-[var(--gush-shadow-panel)]">
        <SectionHeading
          eyebrow="Read Tonight"
          title="Choose your next read"
          description="Comics, novels, or whatever clicks first."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              href: "/comics",
              title: "Comics",
              body: "Bold covers, cliffhangers, and fast reads.",
              icon: Flame,
            },
            {
              href: "/novels",
              title: "Novels",
              body: "Moodier stories built for one more chapter.",
              icon: Sparkles,
            },
            {
              href: "/search",
              title: "Discovery",
              body: "Start with a vibe and follow what clicks.",
              icon: Library,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[24px] border border-white/10 bg-black/15 p-4 transition-colors hover:bg-white/[0.05]"
              >
                <Icon className="size-5 text-[var(--gush-cyan)]" />
                <h3 className="mt-3 text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/64">
                  {item.body}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </StorefrontPage>
  );
}

export default function HomeLandingPage({
  initialSearchParams = {},
  initialHomeData = null,
}) {
  void initialSearchParams;
  const { contentMode } = useAdultGateStore();
  const initialPayloadMode = String(initialHomeData?.contentMode || "").trim();
  const effectiveInitialData =
    initialHomeData && initialPayloadMode === contentMode ? initialHomeData : null;

  return (
    <HomeDataProvider initialData={effectiveInitialData}>
      <HomeLandingContent initialHomeData={effectiveInitialData} />
    </HomeDataProvider>
  );
}
