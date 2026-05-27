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

    return {
      featured,
      trending,
      updates: updates.slice(0, 8),
      continueItems,
      completed: completed.slice(0, 8),
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
          eyebrow="Featured Hero"
          primaryLabel="Start Reading"
          primaryHref={
            initialHomeData?.canonicalHome?.featuredReadHref ||
            buildReadHref(homeModel.featured)
          }
          secondaryLabel="Open Series"
          stats={featuredStats}
          chips={(Array.isArray(homeModel.featured?.genres)
            ? homeModel.featured.genres
            : []
          ).slice(0, 3)}
        />
      ) : loading ? null : (
        <EmptyShelf
          title="The front page is warming up"
          description="Once stories are live in this mode, the hero and shelves will show up here."
          actionHref="/search"
        />
      )}

      {homeModel.trending.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Trending Covers"
            title="Tap what looks impossible to ignore"
            description="Cover-first picks built for quick entry, late-night binging, and instant curiosity."
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
          title="Fresh drops worth opening now"
          description="Recently updated chapters, quick catch-ups, and titles with real reading momentum."
        />
        {homeModel.updates.length > 0 ? (
          <UpdateList items={homeModel.updates} sectionName="home_new_episodes" />
        ) : (
          <EmptyShelf
            title="No new drops yet"
            description="Updates will land here as soon as the release flow catches up."
            actionHref="/comics"
          />
        )}
      </section>

      {homeModel.continueItems.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Continue Reading"
            title="Your last open tabs"
            description="Jump back into the exact title you were in the middle of."
            action={
              <Link
                href="/library"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/76"
              >
                <Library className="size-4" />
                Library
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
            title="No waiting. Just keep going."
            description="Finished series when you want payoff without hanging around for the next drop."
          />
          <ShelfScroller>
            {homeModel.completed.map((series, index) => (
              <CoverCard
                key={series.id}
                series={series}
                href={`/series/${series.id}`}
                badge="Completed"
                actionLabel="Binge now"
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
          eyebrow="Quick Routes"
          title="Where to next?"
          description="Jump straight into the shelf that matches what you want to read right now."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              href: "/comics",
              title: "Comics",
              body: "Open cover-heavy action, romance, and cliffhanger shelves.",
              icon: Flame,
            },
            {
              href: "/novels",
              title: "Novels",
              body: "Go narrower, moodier, and more chapter-driven.",
              icon: Sparkles,
            },
            {
              href: "/search",
              title: "Discovery",
              body: "Browse by vibe, genre, update speed, or format.",
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
