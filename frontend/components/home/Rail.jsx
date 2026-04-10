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

const RAIL_SURFACE_BY_ID = {
  following:
    "border-white/10 bg-[linear-gradient(180deg,rgba(14,18,28,0.94),rgba(9,12,18,0.98))]",
  continue:
    "border-white/10 bg-[linear-gradient(180deg,rgba(16,20,28,0.94),rgba(8,12,18,0.98))]",
  trending:
    "border-white/10 bg-[linear-gradient(180deg,rgba(15,18,24,0.94),rgba(9,12,18,0.98))]",
  completed:
    "border-white/10 bg-[linear-gradient(180deg,rgba(14,20,22,0.94),rgba(8,12,18,0.98))]",
  new: "border-white/10 bg-[linear-gradient(180deg,rgba(16,18,28,0.94),rgba(8,12,18,0.98))]",
  ttf: "border-white/10 bg-[linear-gradient(180deg,rgba(16,21,22,0.94),rgba(8,12,18,0.98))]",
  adult:
    "border-[rgba(255,107,107,0.2)] bg-[linear-gradient(180deg,rgba(22,16,18,0.96),rgba(9,12,18,0.98))]",
  default:
    "bg-[linear-gradient(180deg,rgba(14,18,28,0.94),rgba(8,12,18,0.98))] border-white/10",
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
  const railSurface =
    RAIL_SURFACE_BY_ID[railName] || RAIL_SURFACE_BY_ID.default;
  const railTheme = RAIL_THEME_BY_ID[railName] || RAIL_THEME_BY_ID.default;
  const isLight = appearance === "light";

  return (
    <section>
      <Card
        className={cn(
          "relative overflow-hidden rounded-[32px] py-0",
          isLight
            ? "border border-[color:var(--gush-border)] bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
            : cn("shadow-[0_24px_90px_rgba(0,0,0,0.24)]", railSurface),
        )}
      >
        <div
          className={cn(
            "absolute inset-0",
            isLight
              ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.88),transparent_44%)]"
              : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,transparent,rgba(255,255,255,0.02))]",
          )}
        />
        <CardContent className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              {eyebrow || railName ? (
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.28em]",
                    isLight ? railTheme.lightAccent : "text-emerald-300/80",
                  )}
                >
                  {eyebrow || railName.replace(/-/g, " ")}
                </p>
              ) : null}
              <h2
                className={cn(
                  "font-display text-2xl font-semibold tracking-tight md:text-[1.95rem]",
                  isLight ? "text-slate-950" : "text-white",
                )}
              >
                {title}
              </h2>
              {reason ? (
                <p
                  className={cn(
                    "max-w-2xl text-sm leading-7",
                    isLight ? "text-slate-500" : "text-neutral-400",
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
                className={cn(
                  "h-10 justify-start gap-2 rounded-full border px-4 text-sm font-semibold",
                  isLight
                    ? "border-[color:var(--gush-border)] bg-white text-slate-800 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
                    : "border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.06]",
                )}
              >
                {ctaLabel}
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>

          {showCreatorShelfLinks && safeItems.length > 0 ? (
            <Card
              className={cn(
                "mt-5 rounded-[24px] py-0 shadow-none",
                isLight
                  ? "border border-[color:var(--gush-border)] bg-white"
                  : "border border-white/10 bg-white/[0.03]",
              )}
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
              className={cn(
                "mt-5 rounded-[24px] py-0 shadow-none",
                isLight
                  ? "border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]"
                  : "border border-white/10 bg-black/20",
              )}
            >
              <CardContent className="p-8 text-center">
                <p
                  className={cn(
                    "text-sm",
                    isLight ? "text-slate-500" : "text-neutral-500",
                  )}
                >
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
