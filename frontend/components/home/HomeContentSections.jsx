"use client";

import { ArrowRight, BookOpen, BookOpenText, CircleHelp, Users } from "lucide-react";
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
        "flex flex-col gap-4 border-b border-black/6 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {Icon ? <Icon className="size-3.5" /> : null}
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-3 font-display text-[1.72rem] font-semibold tracking-tight text-slate-950 sm:text-[2.1rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
        ) : null}
      </div>

      {ctaLabel && typeof onCtaClick === "function" ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onCtaClick}
          className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-slate-600 hover:bg-transparent hover:text-slate-950"
        >
          {ctaLabel}
          <ArrowRight className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

function FallbackDiscoveryCard({ eyebrow, title, description, label, onClick }) {
  return (
    <Card className="overflow-hidden rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,243,236,0.95))] py-0 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <CardContent className="p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-[1.75rem] font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">{description}</p>
        <Button
          type="button"
          variant="ghost"
          onClick={onClick}
          className="mt-5 h-auto rounded-full px-0 py-0 text-sm font-semibold text-slate-700 hover:bg-transparent hover:text-slate-950"
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
  actionLabel = "View Series",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6 md:space-y-7">
      <HomeSectionHeader
        icon={Icon}
        eyebrow={eyebrow}
        title={title}
        description={description}
        ctaLabel={ctaLabel}
        onCtaClick={onCtaClick}
      />

      <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.id}>
            <PortraitCard
              item={item}
              tone={item.coverTone}
              appearance="light"
              actionLabel={actionLabel}
              onClick={() => onItemClick?.(item)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeGuideCard({ icon: Icon, eyebrow, title, description, ctaLabel, onClick }) {
  return (
    <Card className="h-full overflow-hidden rounded-[28px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,238,0.94))] py-0 shadow-[0_14px_30px_rgba(15,23,42,0.045)]">
      <CardContent className="flex h-full flex-col p-5 sm:p-6">
        <div className="flex size-11 items-center justify-center rounded-[18px] border border-black/6 bg-white/90 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <Icon className="size-5" />
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {eyebrow}
        </p>
        <h3 className="mt-2 font-display text-[1.3rem] font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{description}</p>
        <Button
          type="button"
          variant="ghost"
          onClick={onClick}
          className="mt-5 h-auto justify-start rounded-full px-0 py-0 text-sm font-semibold text-slate-700 hover:bg-transparent hover:text-slate-950"
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
    id: "guide-comics",
    icon: BookOpenText,
    eyebrow: "Format",
    title: "Comics",
    description: "Panel-led stories with a crisp reading rhythm and strong visual pacing.",
    ctaLabel: "Browse Comics",
    href: "/comics",
  },
  {
    id: "guide-novels",
    icon: BookOpen,
    eyebrow: "Format",
    title: "Novels",
    description: "Serialized prose built for quieter sessions and chapter-by-chapter momentum.",
    ctaLabel: "Browse Novels",
    href: "/novels",
  },
  {
    id: "guide-creators",
    icon: Users,
    eyebrow: "Creators",
    title: "Meet the Creators",
    description: "Explore the writers, artists, teams, and studios shaping each story world.",
    ctaLabel: "View Creators",
    href: "/creators",
  },
  {
    id: "guide-help",
    icon: CircleHelp,
    eyebrow: "Help",
    title: "Need Help?",
    description: "Find support for reading, accounts, and content settings without digging around.",
    ctaLabel: "Get Help",
    href: "/support",
  },
];

export default function HomeContentSections({
  showCatalogFallback,
  homepageFallbackCards,
  featuredSeriesItems,
  startHereItems,
  onFallbackClick,
  onBrowseAllSeries,
  onFeaturedItemClick,
  onStartHereItemClick,
  onGuideClick,
}) {
  return (
    <div className="space-y-12 md:space-y-16">
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
            eyebrow="Editorial picks for right now"
            title="Featured Series"
            description="Hand-picked stories to start with."
            ctaLabel="Browse all series"
            onCtaClick={onBrowseAllSeries}
            items={featuredSeriesItems}
            actionLabel="View Series"
            onItemClick={onFeaturedItemClick}
          />

          <HomeShelfSection
            icon={BookOpenText}
            eyebrow="A quieter first step"
            title="Start here"
            description="Reader-friendly picks when you want a confident entry point instead of a crowded catalog."
            items={startHereItems}
            actionLabel="Read Chapter 1"
            onItemClick={onStartHereItemClick}
          />
        </>
      )}

      <section className="space-y-6 md:space-y-7">
        <HomeSectionHeader
          eyebrow="Choose your reading pace"
          title="Browse by Format"
          description="Move from formats to creators and support without breaking the calm of the page."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
