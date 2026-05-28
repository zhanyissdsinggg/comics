"use client";

import Image from "next/image";
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
import { resolveDisplayImageUrl } from "../../lib/fallbackImage";

const GUIDE_CARDS = [
  {
    id: "guide-featured",
    icon: Compass,
    eyebrow: "Now",
    title: "Trending",
    description: "",
    ctaLabel: "Trending",
    href: "/rankings",
    accent: "bg-[#00E5FF] text-black",
  },
  {
    id: "guide-comics",
    icon: BookOpenText,
    eyebrow: "Format",
    title: "Comics",
    description: "",
    ctaLabel: "Comics",
    href: "/comics",
    accent: "bg-[#FFE500] text-black",
  },
  {
    id: "guide-novels",
    icon: BookOpen,
    eyebrow: "Format",
    title: "Novels",
    description: "",
    ctaLabel: "Novels",
    href: "/novels",
    accent: "bg-[#FF007A] text-white",
  },
  {
    id: "guide-creators",
    icon: Users,
    eyebrow: "Credits",
    title: "Creators",
    description: "",
    ctaLabel: "Creators",
    href: "/creators",
    accent: "bg-[#0b0b0b] text-white",
  },
];

const SECTION_STYLES = {
  featured: {
    shell: "bg-[#FFE500]",
    panel: "bg-[#0b0b0b]",
    eyebrow: "text-black/70",
    title: "text-black",
    description: "text-black/75",
    cta: "bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
  },
  comics: {
    shell: "bg-white",
    panel: "bg-[#0b0b0b]",
    eyebrow: "text-black/70",
    title: "text-black",
    description: "text-black/75",
    cta: "bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
  },
  novels: {
    shell: "bg-[#FF007A]",
    panel: "bg-[#0b0b0b]",
    eyebrow: "text-white/70",
    title: "text-white",
    description: "text-white/75",
    cta: "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
  },
  start: {
    shell: "bg-[#00E5FF]",
    panel: "bg-[#0b0b0b]",
    eyebrow: "text-black/70",
    title: "text-black",
    description: "text-black/75",
    cta: "bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
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
          <p
            className={cn(
              "text-[11px] font-black uppercase tracking-[0.18em] sm:text-sm",
              styles.eyebrow,
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            "mt-1.5 text-[clamp(1.7rem,5vw,3.5rem)] font-black uppercase leading-[0.92] tracking-[-0.05em] sm:mt-2",
            styles.title,
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-3 max-w-[34rem] text-sm font-semibold leading-6",
              styles.description,
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {ctaLabel && typeof onCtaClick === "function" ? (
        <button
          type="button"
          onClick={onCtaClick}
          className={cn(
            "inline-flex items-center gap-2 border-[3px] border-black px-5 py-3 text-xs font-black uppercase tracking-[0.08em] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none sm:text-sm",
            styles.cta,
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
        "group w-full rounded-[32px] border-[3px] border-black bg-[#0b0b0b] p-5 text-left text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none sm:p-8",
        accentClass,
      )}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70 sm:text-sm">
        {eyebrow}
      </p>
      <h3 className="mt-2.5 text-[clamp(1.45rem,4vw,2.8rem)] font-black uppercase leading-[0.94] tracking-[-0.05em] text-white sm:mt-3">
        {title}
      </h3>
      {description ? (
        <p className="mt-4 max-w-[28rem] text-sm font-semibold leading-6 text-white/75">
          {description}
        </p>
      ) : null}
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-white sm:mt-6 sm:text-sm">
        {label}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
}

function ShelfComicCard({ item, onClick, actionLabel = "View title" }) {
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
      data-testid={
        item?.id ? `home-shelf-series-${item.id}` : "home-shelf-series"
      }
      className="group text-left"
      aria-label={actionLabel ? `${actionLabel} ${title}` : `View ${title}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden border-[3px] border-black bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        {coverUrl ? (
          <Image
            src={resolveDisplayImageUrl(coverUrl, { kind: "cover" })}
            alt={coverAlt}
            fill
            sizes="(max-width: 640px) 44vw, (max-width: 1024px) 22vw, 240px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,#111827,#374151,#0f172a)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {badge ? (
          <div className="absolute left-2 top-2 border-2 border-black bg-[#FF007A] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            {badge}
          </div>
        ) : null}

        {genres.length > 0 ? (
          <div className="absolute right-2 top-2 border-2 border-black bg-[#FFE500] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
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
  actionLabel = "View title",
  sectionTone = "featured",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const styles = SECTION_STYLES[sectionTone] || SECTION_STYLES.featured;

  return (
    <section
      className={cn("border-y-[4px] border-black py-9 sm:py-14", styles.shell)}
    >
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
      className="group flex h-full flex-col rounded-[26px] border-2 border-black bg-[#0b0b0b] p-4 text-left text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 sm:p-6"
    >
      <div
        className={cn(
          "inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
          accent,
        )}
      >
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-white/65 sm:mt-6 sm:text-xs">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-[1.2rem] font-black uppercase leading-[0.96] tracking-[-0.04em] text-white sm:text-[1.7rem]">
        {title}
      </h3>
      {description ? (
        <p className="mt-3 flex-1 text-sm font-semibold leading-6 text-white/75">
          {description}
        </p>
      ) : null}
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-white sm:mt-6 sm:text-sm">
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
      className="group grid grid-cols-[2.25rem_56px_minmax(0,1fr)] items-center gap-3 rounded-[22px] border-2 border-black bg-[#0b0b0b] p-3 text-left text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 sm:grid-cols-[3rem_64px_minmax(0,1fr)] sm:gap-4"
    >
      <div
        className={cn(
          "text-center text-[2rem] font-black leading-none tracking-[-0.06em] sm:text-[2.5rem]",
          rank <= 3 ? "text-[#00E5FF]" : "text-white/35",
        )}
      >
        {rank}
      </div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[20px] border-2 border-black bg-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={coverAlt}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,#111827,#0b0b0b,#000000)]" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="line-clamp-2 text-[13px] font-black uppercase leading-[1.1] tracking-[-0.03em] text-white sm:line-clamp-1 sm:text-sm">
            {title}
          </p>
        </div>
        {author ? (
          <p className="mt-2 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/65">
            {author}
          </p>
        ) : null}
        {meta ? (
          <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-4 text-white/75 sm:mt-2 sm:text-xs sm:leading-5">
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
    <section className="border-y-[4px] border-black bg-[#00E5FF] py-12 sm:py-16">
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[38rem]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-black/70">
              This Week
            </p>
            <h2 className="mt-2 text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-[0.9] tracking-[-0.05em] text-black">
              Trending
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#FFE500] px-4 py-2 text-sm font-black tracking-[0.04em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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
    "bg-[#0b0b0b] text-white",
    "bg-[#0b0b0b] text-white",
    "bg-[#0b0b0b] text-white",
    "bg-[#0b0b0b] text-white",
    "bg-[#0b0b0b] text-white",
    "bg-[#0b0b0b] text-white",
    "bg-[#0b0b0b] text-white",
    "bg-[#0b0b0b] text-white",
  ];

  return (
    <section className="border-y-[4px] border-black bg-[#FFE500] py-5 sm:py-6">
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-black/60">
              Genres
            </p>
            <h2 className="mt-1 text-[clamp(1.6rem,4vw,2.5rem)] font-black uppercase tracking-[-0.04em] text-black">
              Genres
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onGuideClick?.("/search")}
            className="h-auto rounded-full border-2 border-black bg-[#00E5FF] px-4 py-2 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5"
          >
            Search
          </Button>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          {pills.map((pill, index) => (
            <button
              key={`${pill}-${index}`}
              type="button"
              onClick={() =>
                onGuideClick?.(`/search?genre=${encodeURIComponent(pill)}`)
              }
              className={cn(
                "shrink-0 rounded-full border-2 border-black px-4 py-2.5 text-xs font-black tracking-[0.06em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 sm:px-5 sm:py-3 sm:text-sm",
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
      return (
        itemId && source.findIndex((entry) => entry?.id === itemId) === index
      );
    })
    .slice(0, 6);

  return (
    <div className="space-y-0 overflow-hidden">
      <GenreKeywordBar keywords={hotKeywords} onGuideClick={onGuideClick} />

      {showCatalogFallback ? (
        <section className="bg-black py-14">
          <div className="mx-auto grid max-w-[1320px] gap-6 px-4 md:grid-cols-2 md:px-8">
            {homepageFallbackCards.map((card, index) => (
              <DiscoveryFallbackCard
                key={card.id}
                eyebrow={card.eyebrow}
                title={card.title}
                description={card.description}
                label={card.label}
                onClick={() => onFallbackClick?.(card.href)}
                accentClass={index % 2 === 0 ? "" : ""}
              />
            ))}
          </div>
        </section>
      ) : (
        <>
          <HomeShelfSection
            eyebrow="Trending"
            title="Trending"
            description=""
            ctaLabel="See all"
            onCtaClick={onBrowseAllSeries}
            items={featuredSeriesItems}
            actionLabel="View title"
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
              eyebrow="New Updates"
              title="Comics"
              description=""
              items={comicSpotlightItems}
              actionLabel="Start reading"
              sectionTone="comics"
              onItemClick={onComicSpotlightItemClick}
            />
          ) : null}

          {Array.isArray(novelSpotlightItems) &&
          novelSpotlightItems.length > 0 ? (
            <HomeShelfSection
              eyebrow="New Updates"
              title="Novels"
              description=""
              items={novelSpotlightItems}
              actionLabel="Start reading"
              sectionTone="novels"
              onItemClick={onNovelSpotlightItemClick}
            />
          ) : null}

          {!hasFormatShelves &&
          Array.isArray(startHereItems) &&
          startHereItems.length > 0 ? (
            <HomeShelfSection
              eyebrow="Start Here"
              title="Start Here"
              description=""
              items={startHereItems}
              actionLabel="Start reading"
              sectionTone="start"
              onItemClick={onStartHereItemClick}
            />
          ) : null}
        </>
      )}

      <section className="border-y-[4px] border-black bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-[1320px] px-4 md:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-[36rem]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/65 sm:text-sm">
                Explore
              </p>
              <h2 className="mt-1.5 text-[clamp(1.7rem,5vw,3.5rem)] font-black uppercase leading-[0.92] tracking-[-0.05em] text-black sm:mt-2">
                More to Read
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onGuideClick?.("/search")}
              className="h-auto w-fit rounded-full border-2 border-black bg-[#00E5FF] px-4 py-2 text-[11px] font-black tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 sm:text-sm"
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

      <section className="relative overflow-hidden border-y-[4px] border-black bg-black py-10 sm:py-14">
        <div className="mx-auto max-w-[1320px] px-4 md:px-8">
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-start">
            <div>
              <p className="inline-block rounded-full border-2 border-black bg-[#0b0b0b] px-3 py-1 text-[11px] font-black tracking-[0.08em] text-white/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:text-sm">
                Creators
              </p>
              <button
                type="button"
                onClick={() => onGuideClick?.("/creators")}
                className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-[#00E5FF] px-5 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 sm:mt-5 sm:w-auto sm:px-6"
              >
                Creators
                <ArrowRight className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                ["Creators", "Credits"],
                ["New", "Today"],
                ["Find", "Genres"],
                ["Your", "Library"],
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
                    "rounded-[26px] border-2 border-black p-4 text-left shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 sm:p-5",
                    index === 1
                      ? "mt-4 bg-[#0b0b0b] text-white sm:mt-8"
                      : index === 2
                        ? "bg-[#FF007A] text-white"
                        : index === 3
                          ? "mt-4 bg-[#FFE500] text-black sm:mt-8"
                          : "bg-[#0b0b0b] text-white",
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
