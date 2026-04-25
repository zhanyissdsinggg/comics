"use client";

import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Compass,
  Crown,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GUIDE_CARDS = [
  {
    id: "guide-featured",
    icon: Compass,
    eyebrow: "Now",
    title: "Featured",
    description: "",
    ctaLabel: "Open",
    href: "/rankings",
    accent: "bg-black/[0.04]",
  },
  {
    id: "guide-comics",
    icon: BookOpenText,
    eyebrow: "Format",
    title: "Comics",
    description: "",
    ctaLabel: "Comics",
    href: "/comics",
    accent: "bg-black/[0.04]",
  },
  {
    id: "guide-novels",
    icon: BookOpen,
    eyebrow: "Format",
    title: "Novels",
    description: "",
    ctaLabel: "Novels",
    href: "/novels",
    accent: "bg-black/[0.04]",
  },
  {
    id: "guide-creators",
    icon: Users,
    eyebrow: "Credits",
    title: "Creators",
    description: "",
    ctaLabel: "Open creators",
    href: "/creators",
    accent: "bg-black/[0.04]",
  },
];

const SECTION_STYLES = {
  featured: {
    shell: "bg-white",
    panel: "bg-white",
    shadow: "shadow-[0_18px_44px_rgba(15,23,42,0.08)]",
    buttonShadow: "shadow-[0_12px_28px_rgba(15,23,42,0.10)]",
  },
  comics: {
    shell: "bg-[#fbfbfd]",
    panel: "bg-white",
    shadow: "shadow-[0_18px_44px_rgba(15,23,42,0.08)]",
    buttonShadow: "shadow-[0_12px_28px_rgba(15,23,42,0.10)]",
  },
  novels: {
    shell: "bg-white",
    panel: "bg-white",
    shadow: "shadow-[0_18px_44px_rgba(15,23,42,0.08)]",
    buttonShadow: "shadow-[0_12px_28px_rgba(15,23,42,0.10)]",
  },
  start: {
    shell: "bg-[#fbfbfd]",
    panel: "bg-white",
    shadow: "shadow-[0_18px_44px_rgba(15,23,42,0.08)]",
    buttonShadow: "shadow-[0_12px_28px_rgba(15,23,42,0.10)]",
  },
};

function normalizeTag(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function HomeSectionHeader({
  eyebrow,
  title,
  description = "",
  ctaLabel,
  onCtaClick,
  sectionTone = "featured",
}) {
  const styles = SECTION_STYLES[sectionTone] || SECTION_STYLES.featured;

  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-[38rem]">
        {eyebrow ? (
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/72 sm:text-sm">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1.5 text-[clamp(1.7rem,5vw,3.5rem)] font-black uppercase leading-[0.92] tracking-[-0.05em] text-black sm:mt-2">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-[34rem] text-sm font-semibold leading-6 text-black/68">
            {description}
          </p>
        ) : null}
      </div>

      {ctaLabel && typeof onCtaClick === "function" ? (
        <button
          type="button"
          onClick={onCtaClick}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-black/12 bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.02em] text-black transition-all hover:border-black/20 hover:bg-black/[0.03] sm:px-5 sm:py-3 sm:text-sm",
            styles.buttonShadow,
          )}
        >
          {ctaLabel}
          <ArrowRight className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function DiscoveryFallbackCard({
  eyebrow,
  title,
  description,
  label,
  onClick,
  accentClass,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-[32px] border border-black/10 p-5 text-left shadow-[0_22px_54px_rgba(15,23,42,0.08)] transition-all hover:border-black/15 hover:bg-black/[0.02] sm:p-8",
        accentClass,
      )}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/72 sm:text-sm">
        {eyebrow}
      </p>
      <h3 className="mt-2.5 text-[clamp(1.45rem,4vw,2.8rem)] font-black uppercase leading-[0.94] tracking-[-0.05em] text-black sm:mt-3">
        {title}
      </h3>
      {description ? (
        <p className="mt-4 max-w-[28rem] text-sm font-semibold leading-6 text-black/70">
          {description}
        </p>
      ) : null}
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-black sm:mt-6 sm:text-sm">
        {label}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
}

function ShelfComicCard({ item, onClick, actionLabel = "Series" }) {
  const coverUrl = String(item?.coverUrl || "").trim();
  const title = String(item?.title || "Story").trim();
  const author = String(item?.author || item?.eyebrow || "").trim();
  const meta = String(item?.metaLabel || "").trim();
  const badge = normalizeTag(item?.badge || item?.statusLabel || item?.type);
  const genres = Array.isArray(item?.genres) ? item.genres.slice(0, 1) : [];
  const seriesType = String(item?.type || item?.seriesType || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const coverAlt =
    title && (seriesType === "comic" || seriesType === "novel")
      ? `${seriesType.charAt(0).toUpperCase()}${seriesType.slice(1)} cover image for ${title}`
      : title
        ? `Cover image for ${title}`
        : "Series cover image";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left"
      aria-label={actionLabel ? `${actionLabel} ${title}` : `Open ${title}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={coverAlt}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,#111827,#374151,#0f172a)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {badge ? (
          <div className="absolute left-2 top-2 rounded-full border border-black/10 bg-white/92 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/72 backdrop-blur-sm">
            {badge}
          </div>
        ) : null}

        {genres.length > 0 ? (
          <div className="absolute right-2 top-2 rounded-full border border-black/10 bg-white/92 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/72 backdrop-blur-sm">
            {genres[0]}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
          <p className="line-clamp-2 text-[15px] font-black leading-[1.15] tracking-[-0.03em] text-white sm:text-base sm:leading-5">
            {title}
          </p>
          {author ? (
            <p className="mt-1 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 sm:text-xs sm:tracking-[0.1em]">
              {author}
            </p>
          ) : null}
          {meta ? (
          <p className="mt-1 line-clamp-1 text-[10px] font-semibold text-white/78 sm:mt-2 sm:text-[11px]">
            {meta}
          </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function HomeShelfSection({
  eyebrow,
  title,
  description = "",
  ctaLabel,
  onCtaClick,
  items,
  onItemClick,
  actionLabel = "Series",
  sectionTone = "featured",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const styles = SECTION_STYLES[sectionTone] || SECTION_STYLES.featured;

  return (
    <section className={cn("border-y-[4px] border-black py-9 sm:py-14", styles.shell)}>
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <HomeSectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          ctaLabel={ctaLabel}
          onCtaClick={onCtaClick}
          sectionTone={sectionTone}
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <ShelfComicCard
              key={item.id}
              item={item}
              actionLabel={actionLabel}
              onClick={() => onItemClick?.(item)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeGuideCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  ctaLabel,
  onClick,
  accent,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col rounded-[30px] border border-black/10 bg-white p-4 text-left shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition-all hover:border-black/15 hover:bg-black/[0.02] sm:p-6"
    >
      <div
        className={cn(
          "inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 text-black",
          accent,
        )}
      >
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-black/65 sm:mt-6 sm:text-xs">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-[1.2rem] font-black uppercase leading-[0.96] tracking-[-0.04em] text-black sm:text-[1.7rem]">
        {title}
      </h3>
      {description ? (
        <p className="mt-3 flex-1 text-sm font-semibold leading-6 text-black/68">
          {description}
        </p>
      ) : null}
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-black sm:mt-6 sm:text-sm">
        {ctaLabel}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
}

function LeaderboardCard({ item, rank, onClick }) {
  const coverUrl = String(item?.coverUrl || "").trim();
  const title = String(item?.title || "Story").trim();
  const author = String(item?.author || "").trim();
  const meta = String(item?.metaLabel || "").trim();
  const seriesType = String(item?.type || item?.seriesType || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const coverAlt =
    title && (seriesType === "comic" || seriesType === "novel")
      ? `${seriesType.charAt(0).toUpperCase()}${seriesType.slice(1)} cover image for ${title}`
      : title
        ? `Cover image for ${title}`
        : "Series cover image";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid grid-cols-[2.25rem_56px_minmax(0,1fr)] items-center gap-3 rounded-[24px] border border-black/10 bg-white p-3 text-left shadow-[0_14px_30px_rgba(15,23,42,0.06)] transition-all hover:border-black/14 hover:bg-[#fcfcfd] sm:grid-cols-[3rem_64px_minmax(0,1fr)] sm:gap-4"
    >
      <div
        className={cn(
          "text-center text-[2rem] font-black leading-none tracking-[-0.06em] sm:text-[2.5rem]",
          rank <= 3
            ? "text-[color:var(--gush-accent,#3157d6)]"
            : "text-black/35",
        )}
      >
        {rank}
      </div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] border border-black/10 bg-[#f6f7f9] shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={coverAlt}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,#f8fafc,#eef2ff,#ffffff)]" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="line-clamp-2 text-[13px] font-black uppercase leading-[1.1] tracking-[-0.03em] text-black sm:line-clamp-1 sm:text-sm">
            {title}
          </p>
        </div>
        {author ? (
          <p className="mt-2 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
            {author}
          </p>
        ) : null}
        {meta ? (
          <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-4 text-black/62 sm:mt-2 sm:text-xs sm:leading-5">
            {meta}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function LeaderboardSection({ items, onItemClick }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-black/8 bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[38rem]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-black/55">
              Weekly
            </p>
            <h2 className="mt-2 text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-[0.9] tracking-[-0.05em] text-black">
              Top 10
            </h2>
            <p className="mt-3 max-w-[34rem] text-sm font-semibold leading-6 text-black/68">
              Strong reads this week.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f6f7f9] px-4 py-2 text-sm font-semibold tracking-[0.04em] text-black/72 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
            <Crown className="size-4" />
            Weekly
          </div>
        </div>

        <div className="grid gap-3 md:gap-4 md:grid-cols-2">
          {items.slice(0, 6).map((item, index) => (
            <LeaderboardCard
              key={item.id}
              item={item}
              rank={index + 1}
              onClick={() => onItemClick?.(item)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function GenreKeywordBar({ keywords = [], onGuideClick }) {
  const visibleKeywords = Array.isArray(keywords)
    ? keywords
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.label || item?.keyword || item?.term || "",
        )
        .map((item) => normalizeTag(item))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const fallbackKeywords = [
    "Action",
    "Romance",
    "Fantasy",
    "Comedy",
    "Sci-Fi",
    "Drama",
  ];

  const pills = visibleKeywords.length > 0 ? visibleKeywords : fallbackKeywords;
  const colors = [
    "bg-white",
    "bg-[#f8f9fb]",
    "bg-[#f3f5f8]",
    "bg-white",
    "bg-[#f8f9fb]",
    "bg-[#f3f5f8]",
    "bg-white",
    "bg-[#f8f9fb]",
  ];

  return (
    <section className="border-y border-black/8 bg-[#111318] py-5 sm:py-6">
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-white/55">
              Genres
            </p>
            <h2 className="mt-1 text-[clamp(1.6rem,4vw,2.5rem)] font-black uppercase tracking-[-0.04em] text-white">
              Find your lane fast
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onGuideClick?.("/search")}
            className="h-auto rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold tracking-[0.03em] text-white hover:bg-white/12"
          >
            Search
          </Button>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          {pills.map((pill, index) => (
            <button
              key={`${pill}-${index}`}
              type="button"
              onClick={() => onGuideClick?.(`/search?genre=${encodeURIComponent(pill)}`)}
              className={cn(
                "shrink-0 rounded-full border border-black/10 px-4 py-2.5 text-xs font-semibold tracking-[0.03em] text-black shadow-[0_12px_28px_rgba(15,23,42,0.10)] transition-all hover:border-black/15 hover:bg-black/[0.03] sm:px-5 sm:py-3 sm:text-sm",
                colors[index % colors.length],
              )}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomeContentSections({
  showCatalogFallback,
  homepageFallbackCards,
  featuredSeriesItems,
  startHereItems,
  comicSpotlightItems,
  novelSpotlightItems,
  hotKeywords,
  onFallbackClick,
  onBrowseAllSeries,
  onFeaturedItemClick,
  onStartHereItemClick,
  onComicSpotlightItemClick,
  onNovelSpotlightItemClick,
  onGuideClick,
}) {
  const hasFormatShelves =
    (Array.isArray(comicSpotlightItems) && comicSpotlightItems.length > 0) ||
    (Array.isArray(novelSpotlightItems) && novelSpotlightItems.length > 0);
  const leaderboardItems = [
    ...(Array.isArray(featuredSeriesItems) ? featuredSeriesItems : []),
    ...(Array.isArray(startHereItems) ? startHereItems : []),
    ...(Array.isArray(comicSpotlightItems) ? comicSpotlightItems : []),
    ...(Array.isArray(novelSpotlightItems) ? novelSpotlightItems : []),
  ]
    .filter((item, index, source) => {
      const itemId = String(item?.id || "").trim();
      return itemId && source.findIndex((entry) => entry?.id === itemId) === index;
    })
    .slice(0, 6);

  return (
    <div className="space-y-0 overflow-hidden">
      <GenreKeywordBar keywords={hotKeywords} onGuideClick={onGuideClick} />

      {showCatalogFallback ? (
        <section className="bg-white py-14">
          <div className="mx-auto grid max-w-[1320px] gap-6 px-4 md:grid-cols-2 md:px-8">
            {homepageFallbackCards.map((card, index) => (
              <DiscoveryFallbackCard
                key={card.id}
                eyebrow={card.eyebrow}
                title={card.title}
                description={card.description}
                label={card.label}
                onClick={() => onFallbackClick?.(card.href)}
                accentClass={index % 2 === 0 ? "bg-white" : "bg-[#f8f9fb]"}
              />
            ))}
          </div>
        </section>
      ) : (
        <>
          <HomeShelfSection
            eyebrow="Featured"
            title="Featured"
            description="The stories getting the most attention right now."
            ctaLabel="See all"
            onCtaClick={onBrowseAllSeries}
            items={featuredSeriesItems}
            actionLabel="Series"
            sectionTone="featured"
            onItemClick={onFeaturedItemClick}
          />

          <LeaderboardSection
            items={leaderboardItems}
            onItemClick={onFeaturedItemClick}
          />

          {Array.isArray(comicSpotlightItems) &&
          comicSpotlightItems.length > 0 ? (
            <HomeShelfSection
              eyebrow="New"
              title="Comics"
              description=""
              items={comicSpotlightItems}
              actionLabel="Read"
              sectionTone="comics"
              onItemClick={onComicSpotlightItemClick}
            />
          ) : null}

          {Array.isArray(novelSpotlightItems) &&
          novelSpotlightItems.length > 0 ? (
            <HomeShelfSection
              eyebrow="Read"
              title="Novels"
              description=""
              items={novelSpotlightItems}
              actionLabel="Read"
              sectionTone="novels"
              onItemClick={onNovelSpotlightItemClick}
            />
          ) : null}

          {!hasFormatShelves &&
          Array.isArray(startHereItems) &&
          startHereItems.length > 0 ? (
            <HomeShelfSection
              eyebrow="Start"
              title="First picks"
              description=""
              items={startHereItems}
              actionLabel="Read"
              sectionTone="start"
              onItemClick={onStartHereItemClick}
            />
          ) : null}
        </>
      )}

      <section className="border-y border-black/8 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-[1320px] px-4 md:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-[36rem]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/45 sm:text-sm">
                Paths
              </p>
              <h2 className="mt-1.5 text-[clamp(1.7rem,5vw,3.5rem)] font-black uppercase leading-[0.92] tracking-[-0.05em] text-black sm:mt-2">
                Shortcuts
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onGuideClick?.("/search")}
              className="h-auto w-fit rounded-full border border-black/12 bg-white px-4 py-2 text-xs font-semibold tracking-[0.03em] text-black hover:bg-black/[0.03] sm:text-sm"
            >
              Search
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {GUIDE_CARDS.map((card) => (
              <HomeGuideCard
                key={card.id}
                icon={card.icon}
                eyebrow={card.eyebrow}
                title={card.title}
                description={card.description}
                ctaLabel={card.ctaLabel}
                accent={card.accent}
                onClick={() => onGuideClick?.(card.href)}
              />
            ))}
          </div>

        </div>
      </section>

      <section className="relative overflow-hidden border-y border-black/8 bg-[#f6f7fb] py-10 sm:py-14">
        <div className="mx-auto max-w-[1320px] px-4 md:px-8">
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-start">
            <div>
              <p className="inline-block rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-black sm:text-sm">
                Creators
              </p>
              <button
                type="button"
                onClick={() => onGuideClick?.("/creators")}
                className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-black bg-black px-5 py-3 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)] transition-all hover:bg-black/90 sm:mt-5 sm:w-auto sm:px-6"
              >
                Creators
                <ArrowRight className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                ["Creators", "Credits"],
                ["Fresh", "Drops"],
                ["Search", "Fast"],
                ["Library", "Saved"],
              ].map(([value, label], index) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    onGuideClick?.(
                      index === 0
                        ? "/creators"
                        : index === 2
                          ? "/search"
                          : "/library",
                    )
                  }
                  className={[
                    "rounded-[28px] border border-black/10 p-4 text-left shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition-all hover:border-black/15 hover:bg-black/[0.02] sm:p-5",
                    index === 1
                      ? "mt-4 bg-white sm:mt-8"
                      : index === 2
                        ? "bg-black text-white"
                        : index === 3
                          ? "mt-4 bg-[#f8f9fb] text-black sm:mt-8"
                          : "bg-white text-black",
                  ].join(" ")}
                >
                  <div className="text-[1.55rem] font-black uppercase tracking-[-0.04em] sm:text-[2rem]">
                    {value}
                  </div>
                  <div className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] opacity-70 sm:text-sm">
                    {label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
