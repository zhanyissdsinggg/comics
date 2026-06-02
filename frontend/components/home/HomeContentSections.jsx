"use client";

import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import {
  CompletedBingeSection,
  FeaturedHero,
  NewEpisodesToday,
  ReadTonightSection,
  ReadersRightNow,
  SectionHeader,
  StoryCard,
  TrendingCovers,
} from "../storefront/home";
import {
  buildGenreLabel,
  buildLatestInstallmentLabel,
  buildReadHref,
  buildStatusLabel,
  uniqueBySeriesId,
} from "../storefront/landingUtils";

function normalizeSuggestion(item, index) {
  const label = String(
    item?.label || item?.keyword || item?.value || item || "",
  ).trim();
  if (!label) {
    return null;
  }

  return {
    label,
    value: String(item?.value || item?.keyword || label).trim(),
    id: `legacy-suggestion-${index}-${label}`,
  };
}

function buildUniqueSeries(...groups) {
  return uniqueBySeriesId(groups.flat().filter(Boolean));
}

function LegacyFallbackSection({ cards = [], onFallbackClick }) {
  if (!cards.length) {
    return null;
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => onFallbackClick?.(card.href)}
          className="text-left"
        >
          <SurfacePanel
            appearance="dark"
            tone="highlight"
            accent="cyan"
            className="h-full space-y-4"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">
                {card.eyebrow}
              </p>
              <h3 className="mt-3 font-display text-[1.9rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                {card.title}
              </h3>
              {card.description ? (
                <p className="mt-3 text-sm leading-7 text-white/68">
                  {card.description}
                </p>
              ) : null}
            </div>
            <div
              className={`inline-flex min-h-[44px] items-center ${storefrontPrimaryButtonClass}`}
            >
              {card.label}
            </div>
          </SurfacePanel>
        </button>
      ))}
    </section>
  );
}

function LegacyGuideGrid({ onGuideClick }) {
  const cards = [
    { id: "guide-trending", title: "Trending", href: "/rankings" },
    { id: "guide-comics", title: "Comics", href: "/comics" },
    { id: "guide-novels", title: "Novels", href: "/novels" },
    { id: "guide-creators", title: "Creators", href: "/creators" },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader title="More to Read" description="Browse the main discovery paths." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onGuideClick?.(card.href)}
            className="text-left"
          >
            <SurfacePanel
              appearance="dark"
              tone="muted"
              accent="rose"
              className="h-full space-y-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/46">
                Browse
              </p>
              <h3 className="font-display text-[1.45rem] font-semibold tracking-[-0.04em] text-white">
                {card.title}
              </h3>
              <div
                className={`inline-flex min-h-[44px] items-center ${storefrontSecondaryButtonClass}`}
              >
                Open
              </div>
            </SurfacePanel>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function HomeContentSections({
  showCatalogFallback = false,
  homepageFallbackCards = [],
  featuredSeriesItems = [],
  startHereItems = [],
  comicSpotlightItems = [],
  novelSpotlightItems = [],
  hotKeywords = [],
  onFallbackClick,
  onBrowseAllSeries,
  onFeaturedItemClick,
  onStartHereItemClick,
  onComicSpotlightItemClick,
  onNovelSpotlightItemClick,
  onGuideClick,
}) {
  const featuredPool = Array.isArray(featuredSeriesItems)
    ? featuredSeriesItems
    : [];
  const startPool = Array.isArray(startHereItems) ? startHereItems : [];
  const comicPool = Array.isArray(comicSpotlightItems)
    ? comicSpotlightItems
    : [];
  const novelPool = Array.isArray(novelSpotlightItems)
    ? novelSpotlightItems
    : [];

  const heroSeries =
    featuredPool[0] || comicPool[0] || novelPool[0] || startPool[0] || null;
  const heroStats = heroSeries
    ? [
        {
          label: "Latest",
          value: buildLatestInstallmentLabel(heroSeries),
        },
        {
          label: "Shelf",
          value: buildStatusLabel(heroSeries),
        },
        {
          label: "Genres",
          value: buildGenreLabel(heroSeries, 2) || "Trending",
        },
      ]
    : [];

  const combinedPool = buildUniqueSeries(
    featuredPool,
    comicPool,
    novelPool,
    startPool,
  );
  const supporting = combinedPool.filter(
    (series) => String(series?.id || "").trim() !== String(heroSeries?.id || "").trim(),
  );
  const suggestions = hotKeywords
    .map(normalizeSuggestion)
    .filter(Boolean)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {showCatalogFallback ? (
        <LegacyFallbackSection
          cards={homepageFallbackCards}
          onFallbackClick={onFallbackClick}
        />
      ) : (
        <>
          {heroSeries ? (
            <FeaturedHero
              series={heroSeries}
              primaryHref={buildReadHref(heroSeries)}
              secondaryHref={`/series/${heroSeries.id}`}
              stats={heroStats}
              chips={(Array.isArray(heroSeries?.genres) ? heroSeries.genres : []).slice(0, 3)}
            />
          ) : null}

          <ReadersRightNow items={featuredPool.slice(0, 4)} />

          <TrendingCovers
            items={buildUniqueSeries(comicPool, novelPool, featuredPool).slice(0, 8)}
          />

          <NewEpisodesToday
            items={buildUniqueSeries(startPool, comicPool, novelPool).slice(0, 3)}
          />

          <CompletedBingeSection
            lead={supporting[0] || null}
            items={supporting.slice(1, 5)}
          />

          {supporting.length > 0 ? (
            <section className="space-y-4">
              <SectionHeader
                title="Start Here"
                description="Legacy shelf compatibility, now rendered with the current storefront system."
              />
              <div className="-mx-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
                <div className="grid min-w-max gap-3 md:grid-cols-2">
                  {supporting.slice(0, 4).map((series, index) => (
                    <div
                      key={series.id}
                      className="w-[calc(100vw-2.5rem)] max-w-[360px] md:w-auto md:max-w-none"
                    >
                      <StoryCard
                        series={series}
                        href={buildReadHref(series)}
                        badge={index === 0 ? "Start Here" : ""}
                        ctaLabel="Start Reading"
                        sourceSection="legacy_home_start_here"
                        position={index + 1}
                        compact
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <ReadTonightSection
            items={buildUniqueSeries(startPool, comicPool, novelPool).slice(0, 4)}
            suggestions={suggestions}
            rankings={featuredPool.slice(0, 5)}
          />
        </>
      )}

      <LegacyGuideGrid onGuideClick={onGuideClick} />

      {heroSeries ? (
        <section className="space-y-4">
          <SectionHeader
            title="Creators"
            description="Jump into creators, search, or the rest of the discovery stack."
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onGuideClick?.("/creators")}
              className={storefrontPrimaryButtonClass}
            >
              Creators
            </button>
            <button
              type="button"
              onClick={() => onGuideClick?.("/search")}
              className={storefrontSecondaryButtonClass}
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => onBrowseAllSeries?.()}
              className={storefrontSecondaryButtonClass}
            >
              Browse All
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
