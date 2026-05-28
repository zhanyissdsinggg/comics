"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { BookOpen, Clock3, Library } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useProgressStore } from "../../store/useProgressStore";
import { trackEvent } from "../../lib/trackEvent";
import {
  CoverCard,
  EmptyShelf,
  GenreShelfSection,
  RankList,
  SectionHeading,
  ShelfScroller,
  StorefrontPage,
  StoryHero,
  UpdateList,
  useCatalogFeed,
} from "./StorefrontScaffold";
import {
  buildCompletedRail,
  buildContinueReadingItems,
  buildGenreLabel,
  buildGenreShelves,
  buildLatestInstallmentLabel,
  buildPopularRail,
  buildReadingTimeLabel,
  buildShortReadsRail,
  buildStatusLabel,
  buildTopTen,
  buildUpdatedRail,
  pickFeaturedSeries,
} from "./landingUtils";

export default function NovelsLandingPage({
  initialSeries = [],
  initialReady = false,
  initialIncludeAdult = false,
}) {
  const { seriesList, loading } = useCatalogFeed({
    initialSeries,
    initialReady,
    initialIncludeAdult,
    type: "novel",
  });
  const { isSignedIn } = useAuthStore();
  const { bySeriesId, loadProgress } = useProgressStore();

  useEffect(() => {
    trackEvent("home_view", {
      contentType: "novel",
      sourceSection: "novels_page",
    });
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      void loadProgress();
    }
  }, [isSignedIn, loadProgress]);

  const model = useMemo(() => {
    const featured = pickFeaturedSeries(seriesList);
    const featuredId = String(featured?.id || "").trim();
    const latest = buildUpdatedRail(seriesList, 16).filter(
      (series) => String(series?.id || "").trim() !== featuredId,
    );
    const continueItems = buildContinueReadingItems(seriesList, bySeriesId).slice(0, 8);
    const continueIds = new Set(
      continueItems.map((series) => String(series?.id || "").trim()),
    );
    const binge = buildCompletedRail(seriesList, 12).filter(
      (series) =>
        String(series?.id || "").trim() !== featuredId &&
        !continueIds.has(String(series?.id || "").trim()),
    );

    return {
      featured,
      latest: latest.slice(0, 8),
      continueItems,
      binge: binge.slice(0, 10),
      shortReads: buildShortReadsRail(seriesList, 10).filter(
        (series) => String(series?.id || "").trim() !== featuredId,
      ),
      genres: buildGenreShelves(seriesList, {
        maxGenres: 4,
        perGenre: 8,
      }),
      top: buildTopTen(seriesList),
      popular: buildPopularRail(seriesList, 12),
    };
  }, [bySeriesId, seriesList]);

  return (
    <StorefrontPage accentClass="from-[rgba(103,232,249,0.16)] via-[rgba(255,255,255,0.04)] to-[rgba(255,79,154,0.08)]">
      {model.featured ? (
        <StoryHero
          series={model.featured}
          eyebrow="Featured Novel"
          primaryLabel="Start Reading"
          secondaryLabel="View Series"
          chips={(Array.isArray(model.featured?.genres) ? model.featured.genres : []).slice(0, 3)}
          stats={[
            {
              label: "Hook",
              value: buildGenreLabel(model.featured, 2) || "Novel serial",
            },
            {
              label: "Reading Time",
              value: buildReadingTimeLabel(model.featured),
            },
            {
              label: "Status",
              value: buildStatusLabel(model.featured),
            },
          ]}
        />
      ) : loading ? null : (
        <EmptyShelf title="No novels here yet" description="Novel picks will show up here as soon as they go live in this mode." actionHref="/search?type=novel" />
      )}

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Latest Chapters"
          title="New chapters you will tear through"
          description="Fresh chapters with no easy stopping point."
        />
        <UpdateList items={model.latest} variant="novel" sectionName="novels_latest" />
      </section>

      {model.continueItems.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Continue Reading"
            title="Pick up where you stopped"
            description="Continue before the mood slips away."
            action={
              <Link
                href="/library"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/76"
              >
                <Library className="size-4" />
                Open Library
              </Link>
            }
          />
          <ShelfScroller>
            {model.continueItems.map((series, index) => (
              <CoverCard
                key={series.id}
                series={series}
                href={`/read/${series.id}/${series.resumeEpisodeId}`}
                variant="novel"
                badge="Resume"
                actionLabel="Continue Reading"
                progressPercent={series.progressPercent}
                onClick={() =>
                  trackEvent("story_click", {
                    seriesId: series?.id,
                    sourceSection: "novels_continue_reading",
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
          eyebrow="Binge Novels"
          title="Long reads with no waiting"
          description="Completed novels for nights that need one more chapter."
        />
        <ShelfScroller>
          {model.binge.map((series, index) => (
            <CoverCard
              key={series.id}
              series={series}
              href={`/series/${series.id}`}
              variant="novel"
              badge="Completed"
              actionLabel="Read Full Series"
              onClick={() =>
                trackEvent("story_click", {
                  seriesId: series?.id,
                  sourceSection: "novels_binge",
                  position: index + 1,
                })
              }
            />
          ))}
        </ShelfScroller>
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Short Reads"
          title="Quick reads, strong hook"
          description="A full mood and a real finish in less time."
        />
        <ShelfScroller>
          {model.shortReads.map((series, index) => (
            <CoverCard
              key={series.id}
              series={series}
              href={`/series/${series.id}`}
              variant="novel"
              badge={buildReadingTimeLabel(series)}
              actionLabel={buildLatestInstallmentLabel(series)}
              onClick={() =>
                trackEvent("story_click", {
                  seriesId: series?.id,
                  sourceSection: "novels_short_reads",
                  position: index + 1,
                })
              }
            />
          ))}
        </ShelfScroller>
      </section>

      <GenreShelfSection shelves={model.genres} variant="novel" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[30px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5 shadow-[var(--gush-shadow-panel)]">
          <SectionHeading
            eyebrow="Late-Night Reads"
            title="Stories built for one more chapter."
            description="Slow burns and sharp hooks for late nights."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: Clock3,
                title: "One more chapter",
                body: "The kind of read where one more chapter turns into three.",
              },
              {
                icon: BookOpen,
                title: "Slow-burn pull",
                body: "Hooks that tighten up and make the next chapter impossible to skip.",
              },
              {
                icon: Library,
                title: "Stay-up-too-late energy",
                body: "Moody stories that keep the light on longer than planned.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-[22px] border border-white/10 bg-black/15 p-4"
                >
                  <Icon className="size-5 text-[var(--gush-cyan)]" />
                  <h3 className="mt-3 text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/64">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <RankList items={model.top} label="Top Novels" />
      </div>
    </StorefrontPage>
  );
}
