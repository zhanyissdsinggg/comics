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
    lightAccent: "text-[var(--gush-accent,#2f6bff)]",
    lightPanel: "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)]",
  },
  continue: {
    lightAccent: "text-[var(--gush-accent,#2f6bff)]",
    lightPanel: "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)]",
  },
  trending: {
    lightAccent: "text-rose-500",
    lightPanel: "border-rose-100 bg-rose-50/80",
  },
  completed: {
    lightAccent: "text-teal-600",
    lightPanel: "border-teal-100 bg-teal-50/80",
  },
  new: {
    lightAccent: "text-sky-600",
    lightPanel: "border-sky-100 bg-sky-50/80",
  },
  ttf: {
    lightAccent: "text-emerald-600",
    lightPanel: "border-emerald-100 bg-emerald-50/80",
  },
  adult: {
    lightAccent: "text-amber-700",
    lightPanel: "border-amber-100 bg-amber-50/80",
  },
  history: {
    lightAccent: "text-slate-700",
    lightPanel: "border-black/8 bg-[#f8f9fc]",
  },
  starter: {
    lightAccent: "text-[var(--gush-accent,#2f6bff)]",
    lightPanel: "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)]",
  },
  "ai-recommended": {
    lightAccent: "text-[var(--gush-accent,#2f6bff)]",
    lightPanel: "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)]",
  },
  recommended: {
    lightAccent: "text-slate-700",
    lightPanel: "border-black/8 bg-[#f8f9fc]",
  },
  default: {
    lightAccent: "text-slate-600",
    lightPanel: "border-black/8 bg-[#f8f9fc]",
  },
};

const RAIL_SURFACE_BY_ID = {
  following:
    "bg-[linear-gradient(180deg,rgba(14,18,28,0.94),rgba(9,12,18,0.98))] border-emerald-400/15",
  continue:
    "bg-[linear-gradient(180deg,rgba(17,22,30,0.94),rgba(8,12,18,0.98))] border-sky-400/15",
  trending:
    "bg-[linear-gradient(180deg,rgba(24,15,20,0.94),rgba(9,12,18,0.98))] border-rose-400/15",
  completed:
    "bg-[linear-gradient(180deg,rgba(14,22,21,0.94),rgba(8,12,18,0.98))] border-teal-400/15",
  new:
    "bg-[linear-gradient(180deg,rgba(20,19,28,0.94),rgba(8,12,18,0.98))] border-violet-400/15",
  ttf:
    "bg-[linear-gradient(180deg,rgba(17,24,24,0.94),rgba(8,12,18,0.98))] border-emerald-400/15",
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
  ctaLabel = "See All",
  appearance = "default",
  showCreatorShelfLinks = false,
  creatorEntryPoint = "CREATOR_CHIP",
  creatorCampaignId = "",
  creatorSourcePath = "/",
  creatorLabel = "More from these creators",
  showActionLabel = true,
  coverFallbackVariant = "default",
}) {
  const router = useRouter();
  const safeItems = ensureArray(items);
  const railSurface = RAIL_SURFACE_BY_ID[railName] || RAIL_SURFACE_BY_ID.default;
  const railTheme = RAIL_THEME_BY_ID[railName] || RAIL_THEME_BY_ID.default;
  const isLight = appearance === "light";

  return (
    <section>
      <Card
        className={cn(
          "relative overflow-hidden rounded-[32px] py-0",
          isLight
            ? "border border-black/6 bg-[rgba(255,255,255,0.92)] shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
            : cn("shadow-[0_24px_90px_rgba(0,0,0,0.24)]", railSurface),
        )}
      >
        <div
          className={cn(
            "absolute inset-0",
            isLight
              ? "bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.04),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.4),transparent)]"
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
              <h2 className={cn("font-display text-2xl font-semibold tracking-tight md:text-[1.95rem]", isLight ? "text-slate-950" : "text-white")}>
                {title}
              </h2>
              {reason ? <p className={cn("max-w-2xl text-sm leading-7", isLight ? "text-slate-500" : "text-neutral-400")}>{reason}</p> : null}
            </div>

            {href ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push(href)}
                className={cn(
                  "h-10 justify-start gap-2 rounded-full border px-4 text-sm font-semibold",
                  isLight
                    ? "border-black/8 bg-white text-slate-800 hover:border-black/12 hover:bg-[#f8f9fc]"
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
                  ? "border border-black/8 bg-white"
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
                  ? "border border-black/8 bg-[#f8f9fc]"
                  : "border border-white/10 bg-black/20",
              )}
            >
              <CardContent className="p-8 text-center">
                <p className={cn("text-sm", isLight ? "text-slate-500" : "text-neutral-500")}>
                  Nothing is ready here yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="-mx-1 mt-5 flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar">
              {safeItems.map((item) => (
                <div key={item.id} className="w-[164px] shrink-0 sm:w-[188px] lg:w-[208px]">
                  <PortraitCard
                    item={item}
                    tone={tone}
                    appearance={appearance}
                    showActionLabel={showActionLabel}
                    coverFallbackVariant={coverFallbackVariant}
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
