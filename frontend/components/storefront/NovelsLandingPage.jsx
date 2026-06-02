"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Library } from "lucide-react";
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
  storefrontInfoCardClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import {
  buildCompletedRail,
  buildContinueReadingItems,
  buildGenreLabel,
  buildGenreShelves,
  buildLatestInstallmentLabel,
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
    const continueItems = buildContinueReadingItems(seriesList, bySeriesId).slice(
      0,
      8,
    );
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
      latest: latest.slice(0, 6),
      continueItems,
      binge: binge.slice(0, 6),
      shortReads: buildShortReadsRail(seriesList, 10)
        .filter((series) => String(series?.id || "").trim() !== featuredId)
        .slice(0, 6),
      genres: buildGenreShelves(seriesList, {
        maxGenres: 4,
        perGenre: 8,
      }),
      top: buildTopTen(seriesList),
    };
  }, [bySeriesId, seriesList]);

  const lowInventory = seriesList.length < 6;
  const compactTopShelf = model.top.length <= 3;
  const minimalTopShelf = model.top.length <= 2;
  const showLateNightShelf = model.binge.length >= 4 && !lowInventory;
  const visibleShortReads = lowInventory ? model.shortReads.slice(0, 4) : model.shortReads;
  const visibleGenres = lowInventory ? [] : model.genres;

  return (
    <StorefrontPage accentClass="from-[rgba(103,232,249,0.16)] via-[rgba(255,255,255,0.04)] to-[rgba(255,79,154,0.08)]">
      {model.featured ? (
        <StoryHero
          series={model.featured}
          eyebrow="Featured Novel"
          primaryLabel="Start Reading"
          secondaryLabel="View Series"
          chips={(Array.isArray(model.featured?.genres)
            ? model.featured.genres
            : []
          ).slice(0, 3)}
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
        <EmptyShelf
          title="No novels here yet"
          description="Novel picks will show up here as soon as they go live in this mode."
          actionHref="/search?type=novel"
        />
      )}

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Latest Chapters"
          title="New chapters you will tear through"
          description="Fresh chapters with no easy stopping point."
        />
        <UpdateList
          items={model.latest}
          variant="novel"
          sectionName="novels_latest"
        />
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Short Reads"
          title="Quick reads, strong hook"
          description="A full mood and a real finish in less time."
        />
        <ShelfScroller>
          {visibleShortReads.map((series, index) => (
            <CoverCard
              key={series.id}
              series={series}
              href={`/series/${series.id}`}
              variant="novel"
              badge="Short Read"
              actionLabel={`${buildReadingTimeLabel(series)} read`}
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

      {lowInventory ? (
        <section className={`${storefrontInfoCardClass} rounded-[28px] p-5 text-white shadow-[var(--gush-shadow-panel)]`}>
          <SectionHeading
            eyebrow="Coming Next"
            title="More novel drops soon"
            description="This shelf is still growing. Fresh late-night reads are on the way."
          />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className={`${storefrontInfoCardClass} rounded-[22px] p-4 text-sm leading-6 text-white/74`}>
              Featured Novel, Latest Chapters, and Short Reads stay up front while the catalog fills out.
            </div>
            <div className={`${storefrontInfoCardClass} rounded-[22px] p-4 text-sm leading-6 text-white/74`}>
              Check back soon for more chapter drops, longer binge runs, and a fuller novel shelf.
            </div>
          </div>
        </section>
      ) : null}

      {compactTopShelf ? (
        <div className={minimalTopShelf ? "max-w-[620px]" : ""}>
          <RankList
            items={model.top}
            label="Top Novels"
            compact
            minimal={minimalTopShelf}
            eyebrow="Reader Rankings"
            description={
              minimalTopShelf ? "Two titles readers are opening first tonight." : "The novel titles readers keep opening first."
            }
          />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className={`${storefrontInfoCardClass} rounded-[30px] p-5 text-white shadow-[var(--gush-shadow-panel)]`}>
            <SectionHeading
              eyebrow="Late-Night Reads"
              title="Stories built for one more chapter."
              description="Short hooks, long pull, and a few complete runs when you're not stopping yet."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[ 
                "Sharp hooks that make one more chapter automatic.",
                "Complete runs and quick reads when you want momentum tonight.",
              ].map((item) => (
                <div
                  key={item}
                  className={`${storefrontInfoCardClass} rounded-[22px] p-4 text-sm leading-6 text-white/72`}
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <RankList
            items={model.top}
            label="Top Novels"
            eyebrow="Reader Rankings"
            description="The novel titles readers keep opening first."
          />
        </div>
      )}

      {model.continueItems.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Continue Reading"
            title="Pick up where you stopped"
            description="Continue before the mood slips away."
            action={
              <Link
                href="/library"
                className={`inline-flex min-h-[44px] items-center gap-2 px-4 text-sm font-medium text-white/76 ${storefrontSecondaryButtonClass}`}
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

      {showLateNightShelf ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Late-Night Reads"
            title="Complete runs for one more chapter"
            description="Finished stories when you want to keep going without waiting a week."
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
                    sourceSection: "novels_late_night_reads",
                    position: index + 1,
                  })
                }
              />
            ))}
          </ShelfScroller>
        </section>
      ) : null}

      {visibleGenres.length > 0 ? (
        <GenreShelfSection
          shelves={visibleGenres}
          variant="novel"
          title="Genre Shelves"
          description="Fantasy pulls, romance spirals, mystery hooks, and more."
        />
      ) : null}
    </StorefrontPage>
  );
}
