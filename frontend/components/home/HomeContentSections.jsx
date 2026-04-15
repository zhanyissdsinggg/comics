"use client";

import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Compass,
  Users,
} from "lucide-react";
import PortraitCard from "./PortraitCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function HomeSectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description = "",
  ctaLabel,
  onCtaClick,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 border-b border-[color:var(--gush-border)] pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-[38rem]">
        {eyebrow ? (
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gush-ink-faint)]">
            {Icon ? (
              <span className="inline-flex size-7 items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-[color:var(--gush-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
                <Icon className="size-3.5" />
              </span>
            ) : null}
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-4 text-[2rem] font-semibold tracking-[-0.055em] text-[color:var(--gush-ink-strong)] sm:text-[2.55rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-[30rem] text-sm leading-6 text-[color:var(--gush-ink-soft)]">
            {description}
          </p>
        ) : null}
      </div>

      {ctaLabel && typeof onCtaClick === "function" ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onCtaClick}
          className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-[color:var(--gush-ink-soft)] hover:bg-transparent hover:text-[color:var(--gush-ink-strong)]"
        >
          {ctaLabel}
          <ArrowRight className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

function FallbackDiscoveryCard({
  eyebrow,
  title,
  description,
  label,
  onClick,
}) {
  return (
    <Card className="overflow-hidden rounded-[36px] border border-[color:var(--gush-border)] bg-white py-0 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <CardContent className="p-7 sm:p-8">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gush-ink-faint)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-3 text-[1.95rem] font-semibold tracking-[-0.055em] text-[color:var(--gush-ink-strong)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-[30rem] text-sm leading-7 text-[color:var(--gush-ink-soft)]">
            {description}
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          onClick={onClick}
          className="mt-6 h-auto rounded-full px-0 py-0 text-sm font-semibold text-[color:var(--gush-ink-soft)] hover:bg-transparent hover:text-[color:var(--gush-ink-strong)]"
        >
          {label}
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function HomeShelfSection({
  icon: Icon,
  eyebrow,
  title,
  description = "",
  ctaLabel,
  onCtaClick,
  items,
  onItemClick,
  actionLabel = "Open series",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[40px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:p-8 md:space-y-9">
      <HomeSectionHeader
        icon={Icon}
        eyebrow={eyebrow}
        title={title}
        description={description}
        ctaLabel={ctaLabel}
        onCtaClick={onCtaClick}
      />

      <div className="grid grid-cols-2 gap-4 pt-7 sm:gap-5 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.id}>
            <PortraitCard
              item={item}
              tone={item.coverTone}
              appearance="light"
              density="compact"
              showActionLabel={false}
              actionLabel={actionLabel}
              onClick={() => onItemClick?.(item)}
            />
          </div>
        ))}
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
}) {
  return (
    <Card className="h-full overflow-hidden rounded-[34px] border border-[color:var(--gush-border)] bg-white py-0 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <CardContent className="flex h-full flex-col p-6 sm:p-7">
        <div className="flex size-11 items-center justify-center rounded-[18px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-[color:var(--gush-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
          <Icon className="size-5" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--gush-ink-faint)]">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-[1.52rem] font-semibold tracking-[-0.055em] text-[color:var(--gush-ink-strong)]">
          {title}
        </h3>
        <div className="mt-3 flex-1">
          {description ? (
            <p className="text-sm leading-7 text-[color:var(--gush-ink-soft)]">
              {description}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={onClick}
          className="mt-6 h-auto justify-start rounded-none border-t border-[color:var(--gush-border-faint)] px-0 pt-4 text-sm font-semibold text-[color:var(--gush-ink-soft)] hover:bg-transparent hover:text-[color:var(--gush-ink-strong)]"
        >
          {ctaLabel}
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

const GUIDE_CARDS = [
  {
    id: "guide-featured",
    icon: Compass,
    eyebrow: "Shelf",
    title: "Featured",
    description: "",
    ctaLabel: "Open Featured",
    href: "/rankings",
  },
  {
    id: "guide-comics",
    icon: BookOpenText,
    eyebrow: "Format",
    title: "Comics",
    description: "",
    ctaLabel: "Browse Comics",
    href: "/comics",
  },
  {
    id: "guide-novels",
    icon: BookOpen,
    eyebrow: "Format",
    title: "Novels",
    description: "",
    ctaLabel: "Browse Novels",
    href: "/novels",
  },
  {
    id: "guide-creators",
    icon: Users,
    eyebrow: "Credits",
    title: "Creators",
    description: "",
    ctaLabel: "Open creators",
    href: "/creators",
  },
];

export default function HomeContentSections({
  showCatalogFallback,
  homepageFallbackCards,
  featuredSeriesItems,
  startHereItems,
  comicSpotlightItems,
  novelSpotlightItems,
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
    <div className="space-y-[4.5rem] md:space-y-[5.5rem]">
      {showCatalogFallback ? (
        <section className="grid gap-5 md:grid-cols-2">
          {homepageFallbackCards.map((card) => (
            <FallbackDiscoveryCard
              key={card.id}
              eyebrow={card.eyebrow}
              title={card.title}
              description={card.description}
              label={card.label}
              onClick={() => onFallbackClick?.(card.href)}
            />
          ))}
        </section>
      ) : (
        <>
          <HomeShelfSection
            icon={BookOpenText}
            eyebrow="Lead Shelf"
            title="Featured"
            description=""
            ctaLabel="Browse all"
            onCtaClick={onBrowseAllSeries}
            items={featuredSeriesItems}
            actionLabel="Open Series"
            onItemClick={onFeaturedItemClick}
          />

          {Array.isArray(comicSpotlightItems) &&
          comicSpotlightItems.length > 0 ? (
            <HomeShelfSection
              icon={BookOpenText}
              eyebrow="Comics"
              title="Comics"
              description=""
              items={comicSpotlightItems}
              actionLabel="Open Comic"
              onItemClick={onComicSpotlightItemClick}
            />
          ) : null}

          {Array.isArray(novelSpotlightItems) &&
          novelSpotlightItems.length > 0 ? (
            <HomeShelfSection
              icon={BookOpen}
              eyebrow="Novels"
              title="Novels"
              description=""
              items={novelSpotlightItems}
              actionLabel="Open Novel"
              onItemClick={onNovelSpotlightItemClick}
            />
          ) : null}

          {!hasFormatShelves &&
          Array.isArray(startHereItems) &&
          startHereItems.length > 0 ? (
            <HomeShelfSection
              icon={BookOpen}
              eyebrow="Starting Points"
              title="First Picks"
              description=""
              items={startHereItems}
              actionLabel="Read Chapter 1"
              onItemClick={onStartHereItemClick}
            />
          ) : null}
        </>
      )}

      <section className="rounded-[40px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.05)] sm:p-8 md:space-y-8">
        <HomeSectionHeader
          eyebrow="Browse"
          title="Browse sections"
          description=""
        />

        <div className="grid gap-4 pt-7 md:grid-cols-2 xl:grid-cols-4">
          {GUIDE_CARDS.map((card) => (
            <HomeGuideCard
              key={card.id}
              icon={card.icon}
              eyebrow={card.eyebrow}
              title={card.title}
              description={card.description}
              ctaLabel={card.ctaLabel}
              onClick={() => onGuideClick?.(card.href)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
