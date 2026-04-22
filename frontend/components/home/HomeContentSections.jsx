"use client";

import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Compass,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GUIDE_CARDS = [
  {
    id: "guide-featured",
    icon: Compass,
    eyebrow: "Browse",
    title: "Featured",
    description: "Go straight to the biggest shelf on the site.",
    ctaLabel: "Open Featured",
    href: "/rankings",
    accent: "bg-[#ffe500]",
  },
  {
    id: "guide-comics",
    icon: BookOpenText,
    eyebrow: "Format",
    title: "Comics",
    description: "Pick up illustrated stories with a strong visual lead.",
    ctaLabel: "Browse Comics",
    href: "/comics",
    accent: "bg-[#00e5ff]",
  },
  {
    id: "guide-novels",
    icon: BookOpen,
    eyebrow: "Format",
    title: "Novels",
    description: "Open serialized fiction built for long reading sessions.",
    ctaLabel: "Browse Novels",
    href: "/novels",
    accent: "bg-[#ff8a00]",
  },
  {
    id: "guide-creators",
    icon: Users,
    eyebrow: "Credits",
    title: "Creators",
    description: "Browse the people and studios behind the stories.",
    ctaLabel: "Open creators",
    href: "/creators",
    accent: "bg-[#ff69b4]",
  },
];

const SECTION_STYLES = {
  featured: {
    shell: "bg-[#ffe500]",
    panel: "bg-white",
    shadow: "shadow-[8px_8px_0_0_rgba(0,0,0,1)]",
    buttonShadow: "shadow-[4px_4px_0_0_rgba(255,255,255,1)]",
  },
  comics: {
    shell: "bg-[#00e5ff]",
    panel: "bg-white",
    shadow: "shadow-[8px_8px_0_0_rgba(0,0,0,1)]",
    buttonShadow: "shadow-[4px_4px_0_0_rgba(255,255,255,1)]",
  },
  novels: {
    shell: "bg-[#ff8a00]",
    panel: "bg-white",
    shadow: "shadow-[8px_8px_0_0_rgba(0,0,0,1)]",
    buttonShadow: "shadow-[4px_4px_0_0_rgba(255,255,255,1)]",
  },
  start: {
    shell: "bg-[#00ff88]",
    panel: "bg-white",
    shadow: "shadow-[8px_8px_0_0_rgba(0,0,0,1)]",
    buttonShadow: "shadow-[4px_4px_0_0_rgba(255,255,255,1)]",
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
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-[38rem]">
        {eyebrow ? (
          <p className="text-sm font-black uppercase tracking-[0.18em] text-black/72">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-[0.9] tracking-[-0.05em] text-black">
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
            "inline-flex items-center gap-2 border-[3px] border-black bg-black px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
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
        "group w-full border-[3px] border-black p-6 text-left shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] sm:p-8",
        accentClass,
      )}
    >
      <p className="text-sm font-black uppercase tracking-[0.18em] text-black/72">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-[clamp(1.8rem,4vw,2.8rem)] font-black uppercase leading-[0.92] tracking-[-0.05em] text-black">
        {title}
      </h3>
      {description ? (
        <p className="mt-4 max-w-[28rem] text-sm font-semibold leading-6 text-black/70">
          {description}
        </p>
      ) : null}
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-black">
        {label}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
}

function ShelfComicCard({ item, onClick, actionLabel = "Open series" }) {
  const coverUrl = String(item?.coverUrl || "").trim();
  const title = String(item?.title || "Story").trim();
  const author = String(item?.author || item?.eyebrow || "").trim();
  const meta = String(item?.metaLabel || "").trim();
  const badge = normalizeTag(item?.badge || item?.statusLabel || item?.type);
  const genres = Array.isArray(item?.genres) ? item.genres.slice(0, 1) : [];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left"
      aria-label={actionLabel ? `${actionLabel} ${title}` : `Open ${title}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden border-[3px] border-black bg-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all duration-300 group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,#111827,#374151,#0f172a)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {badge ? (
          <div className="absolute left-2 top-2 border-2 border-black bg-[#ff007a] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
            {badge}
          </div>
        ) : null}

        {genres.length > 0 ? (
          <div className="absolute right-2 top-2 border-2 border-black bg-[#ffe500] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-black">
            {genres[0]}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-2 text-base font-black leading-5 tracking-[-0.03em] text-white">
            {title}
          </p>
          {author ? (
            <p className="mt-1 line-clamp-1 text-xs font-semibold uppercase tracking-[0.1em] text-white/72">
              {author}
            </p>
          ) : null}
          {meta ? (
            <p className="mt-2 line-clamp-1 text-[11px] font-semibold text-white/80">
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
  actionLabel = "Open series",
  sectionTone = "featured",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const styles = SECTION_STYLES[sectionTone] || SECTION_STYLES.featured;

  return (
    <section
      className={cn(
        "border-y-[4px] border-black py-12",
        styles.shell,
      )}
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
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
      className="group flex h-full flex-col border-[3px] border-black bg-white p-6 text-left shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
    >
      <div
        className={cn(
          "inline-flex h-12 w-12 items-center justify-center border-[3px] border-black text-black",
          accent,
        )}
      >
        <Icon className="size-5" />
      </div>
      <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-black/65">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-[1.7rem] font-black uppercase leading-[0.94] tracking-[-0.04em] text-black">
        {title}
      </h3>
      {description ? (
        <p className="mt-3 flex-1 text-sm font-semibold leading-6 text-black/68">
          {description}
        </p>
      ) : null}
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-black">
        {ctaLabel}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
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
    "bg-[#ff007a]",
    "bg-[#ffe500]",
    "bg-[#8b00ff]",
    "bg-[#00e5ff]",
    "bg-[#ff6b00]",
    "bg-[#00ff88]",
    "bg-[#ff69b4]",
    "bg-[#ffd700]",
  ];

  return (
    <section className="border-y-[4px] border-[#ffe500] bg-black py-6">
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-white/72">
              Browse
            </p>
            <h2 className="mt-1 text-[clamp(1.6rem,4vw,2.5rem)] font-black uppercase tracking-[-0.04em] text-white">
              Pick your vibe
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onGuideClick?.("/search")}
            className="h-auto rounded-none border-b-2 border-[#ffe500] px-0 py-0 text-sm font-black uppercase tracking-[0.08em] text-[#ffe500] hover:bg-transparent hover:text-white"
          >
            Search
          </Button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {pills.map((pill, index) => (
            <button
              key={`${pill}-${index}`}
              type="button"
              onClick={() => onGuideClick?.(`/search?genre=${encodeURIComponent(pill)}`)}
              className={cn(
                "shrink-0 border-[3px] border-black px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0_0_rgba(255,229,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
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
                accentClass={index % 2 === 0 ? "bg-[#ffe500]" : "bg-[#00e5ff]"}
              />
            ))}
          </div>
        </section>
      ) : (
        <>
          <HomeShelfSection
            eyebrow="Trending now"
            title="Featured"
            description="The stories getting the most attention right now."
            ctaLabel="View all"
            onCtaClick={onBrowseAllSeries}
            items={featuredSeriesItems}
            actionLabel="Open series"
            sectionTone="featured"
            onItemClick={onFeaturedItemClick}
          />

          {Array.isArray(comicSpotlightItems) &&
          comicSpotlightItems.length > 0 ? (
            <HomeShelfSection
              eyebrow="Comics"
              title="Comics"
              description="Fast-entry visual stories built for bingeable sessions."
              items={comicSpotlightItems}
              actionLabel="Open comic"
              sectionTone="comics"
              onItemClick={onComicSpotlightItemClick}
            />
          ) : null}

          {Array.isArray(novelSpotlightItems) &&
          novelSpotlightItems.length > 0 ? (
            <HomeShelfSection
              eyebrow="Novels"
              title="Novels"
              description="Serial fiction for readers who want longer arcs and quieter immersion."
              items={novelSpotlightItems}
              actionLabel="Open novel"
              sectionTone="novels"
              onItemClick={onNovelSpotlightItemClick}
            />
          ) : null}

          {!hasFormatShelves &&
          Array.isArray(startHereItems) &&
          startHereItems.length > 0 ? (
            <HomeShelfSection
              eyebrow="Fresh starts"
              title="First picks"
              description="Good entry points when you want a chapter-one start."
              items={startHereItems}
              actionLabel="Read Chapter 1"
              sectionTone="start"
              onItemClick={onStartHereItemClick}
            />
          ) : null}
        </>
      )}

      <section className="border-y-[4px] border-black bg-[#111111] py-14">
        <div className="mx-auto max-w-[1320px] px-4 md:px-8">
          <div className="mb-8 max-w-[36rem]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-white/60">
              Guide
            </p>
            <h2 className="mt-2 text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-[0.9] tracking-[-0.05em] text-white">
              Find your lane fast
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/68">
              Jump into the shelf, format, or credit lane that matches how you
              like to browse.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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

          <div className="mt-8 border-[3px] border-white/16 bg-black/40 p-5 text-white shadow-[8px_8px_0_0_rgba(255,255,255,0.08)] sm:flex sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border-[3px] border-black bg-[#ffe500] text-black">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
                  Need a faster start?
                </p>
                <p className="mt-2 max-w-[34rem] text-sm font-semibold leading-6 text-white/66">
                  Open the search page when you already know the mood, genre, or
                  creator you want.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onGuideClick?.("/search")}
              className="mt-5 inline-flex items-center gap-2 border-[3px] border-black bg-[#ff007a] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0_0_rgba(255,255,255,0.18)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none sm:mt-0"
            >
              Open search
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
