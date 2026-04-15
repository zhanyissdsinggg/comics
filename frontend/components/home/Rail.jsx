"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import CreatorShelfLinks from "../common/CreatorShelfLinks";
import PortraitCard from "./PortraitCard";
import { ensureArray } from "../../lib/validators";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const RAIL_THEME_BY_ID = {
  following: {
    lightAccent: "text-slate-500",
    lightPanel: "border-[color:var(--gush-border)] bg-white",
  },
  continue: {
    lightAccent: "text-slate-500",
    lightPanel: "border-[color:var(--gush-border)] bg-white",
  },
  trending: {
    lightAccent: "text-[color:var(--gush-ink-soft)]",
    lightPanel: "border-[color:var(--gush-border)] bg-white",
  },
  completed: {
    lightAccent: "text-[color:var(--gush-ink-soft)]",
    lightPanel: "border-[color:var(--gush-border)] bg-white",
  },
  new: {
    lightAccent: "text-slate-500",
    lightPanel: "border-[color:var(--gush-border)] bg-white",
  },
  ttf: {
    lightAccent: "text-[color:var(--gush-ink-soft)]",
    lightPanel: "border-[color:var(--gush-border)] bg-white",
  },
  adult: {
    lightAccent: "text-[color:var(--gush-danger)]",
    lightPanel: "border-[color:var(--gush-border)] bg-white",
  },
  history: {
    lightAccent: "text-slate-700",
    lightPanel:
      "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]",
  },
  starter: {
    lightAccent: "text-slate-500",
    lightPanel: "border-[color:var(--gush-border)] bg-white",
  },
  "ai-recommended": {
    lightAccent: "text-slate-500",
    lightPanel: "border-[color:var(--gush-border)] bg-white",
  },
  recommended: {
    lightAccent: "text-slate-700",
    lightPanel:
      "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]",
  },
  default: {
    lightAccent: "text-slate-600",
    lightPanel:
      "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]",
  },
};

export default function Rail({
  eyebrow = "",
  title,
  reason = "",
  items,
  tone,
  railName,
  onItemClick,
  href = "",
  ctaLabel = "Browse all",
  appearance = "light",
  showCreatorShelfLinks = false,
  creatorEntryPoint = "CREATOR_CHIP",
  creatorCampaignId = "",
  creatorSourcePath = "/",
  creatorLabel = "More from these creators",
  showActionLabel = true,
  coverFallbackVariant = "default",
  interactionMode = "link",
}) {
  const router = useRouter();
  const safeItems = ensureArray(items);
  const railTheme = RAIL_THEME_BY_ID[railName] || RAIL_THEME_BY_ID.default;

  return (
    <section>
      <Card
        className="relative overflow-hidden rounded-[32px] border border-[color:var(--gush-border)] bg-white py-0 shadow-[0_12px_24px_rgba(15,23,42,0.05)]"
      >
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),transparent_42%)]"
        />
        <CardContent className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              {eyebrow || railName ? (
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.28em]",
                    railTheme.lightAccent,
                  )}
                >
                  {eyebrow || railName.replace(/-/g, " ")}
                </p>
              ) : null}
              <h2
                className={cn(
                  "font-display text-2xl font-semibold tracking-tight md:text-[1.95rem]",
                  "text-slate-950",
                )}
              >
                {title}
              </h2>
              {reason ? (
                <p
                  className={cn(
                    "max-w-2xl text-sm leading-7",
                    "text-slate-500",
                  )}
                >
                  {reason}
                </p>
              ) : null}
            </div>

            {href ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push(href)}
                className="h-10 justify-start gap-2 rounded-full border border-[color:var(--gush-border)] bg-white px-4 text-sm font-semibold text-slate-800 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
              >
                {ctaLabel}
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>

          {showCreatorShelfLinks && safeItems.length > 0 ? (
            <Card
              className="mt-5 rounded-[24px] border border-[color:var(--gush-border)] bg-white py-0 shadow-none"
            >
              <CardContent className="p-4">
                <CreatorShelfLinks
                  items={safeItems}
                  entryPoint={creatorEntryPoint}
                  campaignId={creatorCampaignId || railName || title}
                  sourcePath={creatorSourcePath}
                  label={creatorLabel}
                  compact
                  appearance={appearance}
                />
              </CardContent>
            </Card>
          ) : null}

          {safeItems.length === 0 ? (
            <Card
              className="mt-5 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] py-0 shadow-none"
            >
              <CardContent className="p-8 text-center">
                <p className="text-sm text-slate-500">
                  Nothing is live here yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="-mx-1 mt-5 flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar">
              {safeItems.map((item) => (
                <div
                  key={item.id}
                  className="w-[164px] shrink-0 sm:w-[188px] lg:w-[208px]"
                >
                  <PortraitCard
                    item={item}
                    tone={tone}
                    appearance={appearance}
                    showActionLabel={showActionLabel}
                    coverFallbackVariant={coverFallbackVariant}
                    interactionMode={interactionMode}
                    onClick={() => onItemClick?.(item, railName || title)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
