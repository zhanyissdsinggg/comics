"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Flame, Trophy } from "lucide-react";
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
  buildGenreLabel,
  buildGenreShelves,
  buildLatestInstallmentLabel,
  buildPopularRail,
  buildStatusLabel,
  buildTopTen,
  buildUpdatedRail,
  pickFeaturedSeries,
  uniqueBySeriesId,
} from "./landingUtils";

export default function ComicsLandingPage({
  initialSeries = [],
  initialReady = false,
  initialIncludeAdult = false,
}) {
  const { seriesList, loading } = useCatalogFeed({
    initialSeries,
    initialReady,
    initialIncludeAdult,
    type: "comic",
  });

  useEffect(() => {
    trackEvent("home_view", {
      contentType: "comic",
      sourceSection: "comics_page",
    });
  }, []);

  const model = useMemo(() => {
    const genrePriority = ["Action", "Romance", "Adventure", "Fantasy"];
    const featured = pickFeaturedSeries(seriesList);
    const featuredId = String(featured?.id || "").trim();
    const updated = buildUpdatedRail(seriesList, 14).filter(
      (series) => String(series?.id || "").trim() !== featuredId,
    );
    const popular = buildPopularRail(seriesList, 16).filter(
      (series) => String(series?.id || "").trim() !== featuredId,
    );
    const fresh = updated.filter(
      (series) =>
        !popular.some(
          (candidate) =>
            String(candidate?.id || "").trim() === String(series?.id || "").trim(),
        ),
    );
    const completed = buildCompletedRail(seriesList, 12).filter(
      (series) => String(series?.id || "").trim() !== featuredId,
    );
    const allGenreShelves = buildGenreShelves(seriesList, {
      maxGenres: 12,
      perGenre: 8,
    });
    const genres = genrePriority
      .map((genre) =>
        allGenreShelves.find(
          (entry) => String(entry?.genre || "").toLowerCase() === genre.toLowerCase(),
        ),
      )
      .filter(Boolean);
    const recentArrivals = uniqueBySeriesId([...fresh, ...updated]).filter(
      (series) => String(series?.id || "").trim() !== featuredId,
    );

    return {
      featured,
      updated: updated.slice(0, 8),
      popular: popular.slice(0, 10),
      fresh: fresh.slice(0, 10),
      recentArrivals: recentArrivals.slice(0, 10),
      completed: completed.slice(0, 10),
      genres,
      topTen: buildTopTen(seriesList),
    };
  }, [seriesList]);

  const showNewShelf = model.fresh.length >= 4;
  const showRecentArrivalsShelf = !showNewShelf && model.recentArrivals.length >= 4;

  return (
    <StorefrontPage accentClass="from-[rgba(255,93,136,0.15)] via-[rgba(255,178,92,0.08)] to-[rgba(103,232,249,0.08)]">
      {model.featured ? (
        <StoryHero
          series={model.featured}
          eyebrow="Featured Comic"
          primaryLabel="Start Reading"
          secondaryLabel="View Series"
          chips={(Array.isArray(model.featured?.genres) ? model.featured.genres : []).slice(0, 3)}
          stats={[
            {
              label: "Genre",
              value: buildGenreLabel(model.featured, 2) || "Comic",
            },
            {
              label: "Latest",
              value: buildLatestInstallmentLabel(model.featured),
            },
            {
              label: "Status",
              value: buildStatusLabel(model.featured),
            },
          ]}
        />
      ) : loading ? null : (
        <EmptyShelf title="No comics here yet" description="Comic picks will show up here as soon as they go live in this mode." actionHref="/search?type=comic" />
      )}

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Today's Updates"
          title="Fresh panels and new chapter drops"
          description="New chapters and quick catch-ups."
        />
        <UpdateList items={model.updated} sectionName="comics_updates" />
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Popular Comics"
          title="The covers readers keep tapping"
          description="The comics everyone keeps opening."
        />
        <ShelfScroller>
          {model.popular.map((series, index) => (
            <CoverCard
              key={series.id}
              series={series}
              href={`/series/${series.id}`}
              variant="comic"
              badge={`#${index + 1}`}
              actionLabel={buildLatestInstallmentLabel(series)}
              onClick={() =>
                trackEvent("story_click", {
                  seriesId: series?.id,
                  sourceSection: "comics_popular",
                  position: index + 1,
                })
              }
            />
          ))}
        </ShelfScroller>
      </section>

      {showNewShelf || showRecentArrivalsShelf ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow={showNewShelf ? "New Comics" : "Recent Arrivals"}
            title={
              showNewShelf
                ? "Recent arrivals and rising launches"
                : "Fresh arrivals worth opening first"
            }
            description={
              showNewShelf
                ? "Fresh launches and early favorites."
                : "New drops and recent updates landing now."
            }
            action={
              <Link
                href="/search?type=comic&sort=latest"
                className={`inline-flex min-h-[44px] items-center px-4 text-sm font-medium text-white/76 ${storefrontSecondaryButtonClass}`}
              >
                Latest drops
              </Link>
            }
          />
          <ShelfScroller>
            {(showNewShelf ? model.fresh : model.recentArrivals).map((series, index) => (
              <CoverCard
                key={series.id}
                series={series}
                href={`/series/${series.id}`}
                variant="comic"
                badge={showNewShelf ? "New" : "Fresh"}
                actionLabel={buildLatestInstallmentLabel(series)}
                onClick={() =>
                  trackEvent("story_click", {
                    seriesId: series?.id,
                    sourceSection: showNewShelf ? "comics_new" : "comics_recent_arrivals",
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
          eyebrow="Completed Comics"
          title="Binge the whole run"
          description="Finished runs when you want the whole story now."
        />
        <ShelfScroller>
          {model.completed.map((series, index) => (
            <CoverCard
              key={series.id}
              series={series}
              href={`/series/${series.id}`}
              variant="comic"
              badge="Completed"
              actionLabel="Read Full Series"
              onClick={() =>
                trackEvent("story_click", {
                  seriesId: series?.id,
                  sourceSection: "comics_completed",
                  position: index + 1,
                })
              }
            />
          ))}
        </ShelfScroller>
      </section>

      <GenreShelfSection
        shelves={model.genres}
        variant="comic"
        title="Genre Shelves"
        description="Action, romance, adventure, and fantasy picks."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${storefrontInfoCardClass} p-5`}>
          <SectionHeading
            eyebrow="Reader Favorites"
            title="Fast starts, new chapters, and complete runs"
            description="Fast starts, new chapters, and complete runs readers keep opening."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: Flame,
                title: "Cliffhanger rush",
                body: "Hard stops and wild reveals that make one more tap automatic.",
              },
              {
                icon: Trophy,
                title: "Weekend catch-up",
                body: "A stack of fresh chapters when you want easy momentum.",
              },
              {
                icon: Flame,
                title: "Full-run binge",
                body: "Completed favorites when waiting a week is not happening.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`${storefrontInfoCardClass} p-4 text-white`}
                >
                  <Icon className="size-5 text-[var(--gush-rose)]" />
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

        <RankList
          items={model.topTen}
          label="Top 10 Comics"
          eyebrow="Reader Rankings"
          description="The comic titles readers keep opening first."
        />
      </div>
    </StorefrontPage>
  );
}
