"use client";

import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  CircleHelp,
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
              <span className="inline-flex size-7 items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-white text-[color:var(--gush-accent)] shadow-[0_8px_18px_rgba(0,0,0,0.05)] dark:bg-white/[0.04]">
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
          <p className="mt-3 max-w-[34rem] text-sm leading-7 text-[color:var(--gush-ink-soft)]">
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
    <Card className="overflow-hidden rounded-[36px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.96))] py-0 shadow-[0_18px_38px_rgba(0,0,0,0.05)]">
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
  actionLabel = "View Series",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[40px] border border-[color:var(--gush-border)] bg-[rgba(255,255,255,0.74)] p-6 shadow-[0_24px_56px_rgba(0,0,0,0.045)] backdrop-blur-xl sm:p-8 md:space-y-9">
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
    <Card className="h-full overflow-hidden rounded-[34px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,247,249,0.96))] py-0 shadow-[0_18px_42px_rgba(0,0,0,0.05)] backdrop-blur-xl">
      <CardContent className="flex h-full flex-col p-6 sm:p-7">
        <div className="flex size-11 items-center justify-center rounded-[18px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-elevated)] text-[color:var(--gush-accent)] shadow-[0_8px_18px_rgba(0,0,0,0.05)] dark:bg-white/[0.06]">
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
          className="mt-6 h-auto justify-start border-t border-[color:var(--gush-border-faint)] rounded-none px-0 pt-4 text-sm font-semibold text-[color:var(--gush-ink-soft)] hover:bg-transparent hover:text-[color:var(--gush-ink-strong)]"
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
    description: "Serialized panels for a faster, more visual reading rhythm.",
    ctaLabel: "Browse Comics",
    href: "/comics",
  },
  {
    id: "guide-novels",
    icon: BookOpen,
    eyebrow: "Format",
    title: "Novels",
    description: "Longer chapters for readers who want a slower pace.",
    ctaLabel: "Browse Novels",
    href: "/novels",
  },
  {
    id: "guide-creators",
    icon: Users,
    eyebrow: "Credits",
    title: "Creators",
    description:
      "Follow the writers, artists, teams, and studios behind each title.",
    ctaLabel: "View Creators",
    href: "/creators",
  },
  {
    id: "guide-help",
    icon: CircleHelp,
    eyebrow: "Support",
    title: "Need Help?",
    description: "Find help with your account, library, and reading flow.",
    ctaLabel: "Open Support",
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
            eyebrow="Editorial Shelf"
            title="Featured Series"
            description="Standout reads chosen for tone, pacing, and staying power."
            ctaLabel="See All Stories"
            onCtaClick={onBrowseAllSeries}
            items={featuredSeriesItems}
            actionLabel="Open Series"
            onItemClick={onFeaturedItemClick}
          />

          <HomeShelfSection
            icon={BookOpen}
            eyebrow="Starting Points"
            title="Start Here"
            description="An easier first pick when you want to start with less risk."
            items={startHereItems}
            actionLabel="Read Chapter 1"
            onItemClick={onStartHereItemClick}
          />
        </>
      )}

      <section className="rounded-[40px] border border-[color:var(--gush-border)] bg-[rgba(255,255,255,0.74)] p-6 shadow-[0_24px_56px_rgba(0,0,0,0.045)] backdrop-blur-xl sm:p-8 md:space-y-8">
        <HomeSectionHeader
          eyebrow="Ways To Read"
          title="Browse by format"
          description="Choose the reading rhythm that fits your mood, then keep going from there."
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
