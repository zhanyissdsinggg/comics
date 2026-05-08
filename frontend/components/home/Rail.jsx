"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import CreatorShelfLinks from "../common/CreatorShelfLinks";
import PortraitCard from "./PortraitCard";
import { ensureArray } from "../../lib/validators";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const RAIL_THEME_BY_ID = {
  following: {
    darkAccent: "text-white/65",
    darkPanel: "border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,31,0.98)_0%,rgba(12,11,22,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.28)]",
  },
  continue: {
    darkAccent: "text-white/65",
    darkPanel: "border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,31,0.98)_0%,rgba(12,11,22,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.28)]",
  },
  trending: {
    darkAccent: "text-white/65",
    darkPanel: "border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,31,0.98)_0%,rgba(12,11,22,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.28)]",
  },
  completed: {
    darkAccent: "text-white/65",
    darkPanel: "border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,31,0.98)_0%,rgba(12,11,22,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.28)]",
  },
  new: {
    darkAccent: "text-white/65",
    darkPanel: "border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,31,0.98)_0%,rgba(12,11,22,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.28)]",
  },
  ttf: {
    darkAccent: "text-white/65",
    darkPanel: "border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,31,0.98)_0%,rgba(12,11,22,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.28)]",
  },
  adult: {
    darkAccent: "text-white/65",
    darkPanel: "border border-[rgba(255,182,211,0.16)] bg-[linear-gradient(180deg,rgba(17,15,27,0.98)_0%,rgba(8,8,15,0.98)_100%)] text-white shadow-[0_24px_56px_rgba(4,4,12,0.4)]",
  },
  history: {
    darkAccent: "text-white/65",
    darkPanel: "border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,31,0.98)_0%,rgba(12,11,22,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.28)]",
  },
  starter: {
    darkAccent: "text-white/65",
    darkPanel: "border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,31,0.98)_0%,rgba(12,11,22,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.28)]",
  },
  "ai-recommended": {
    darkAccent: "text-white/65",
    darkPanel: "border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,31,0.98)_0%,rgba(12,11,22,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.28)]",
  },
  recommended: {
    darkAccent: "text-white/65",
    darkPanel: "border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,31,0.98)_0%,rgba(12,11,22,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.28)]",
  },
  default: {
    darkAccent: "text-white/65",
    darkPanel: "border border-white/10 bg-[linear-gradient(180deg,rgba(18,16,31,0.98)_0%,rgba(12,11,22,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.28)]",
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
  ctaLabel = "See All",
  appearance = "dark",
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
        <div
        className={cn(
          "relative overflow-hidden rounded-[26px] border py-0",
          railTheme.darkPanel,
        )}
      >
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              {eyebrow || railName ? (
                <p
                  className={cn(
                    "text-[11px] font-black uppercase tracking-[0.28em]",
                    railTheme.darkAccent,
                  )}
                >
                  {eyebrow || railName.replace(/-/g, " ")}
                </p>
              ) : null}
              <h2
                className={cn(
                  "font-display text-2xl font-black tracking-[-0.05em] md:text-[1.95rem]",
                  "text-white",
                )}
              >
                {title}
              </h2>
              {reason ? (
                <p
                  className={cn(
                    "max-w-2xl text-sm leading-7",
                    "text-white/75",
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
                className="h-10 justify-start gap-2 rounded-full border border-[rgba(255,182,211,0.32)] bg-[linear-gradient(135deg,#ff7faa_0%,#ff8fcf_100%)] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#26121e] shadow-[0_12px_26px_rgba(255,118,170,0.28)] transition-all duration-150 ease-out hover:-translate-y-0.5"
              >
                {ctaLabel}
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>

          {showCreatorShelfLinks && safeItems.length > 0 ? (
            <div
              className="mt-5 rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.03)] py-0 shadow-[0_14px_34px_rgba(8,6,20,0.2)]"
            >
              <div className="p-4">
                <CreatorShelfLinks
                  items={safeItems}
                  entryPoint={creatorEntryPoint}
                  campaignId={creatorCampaignId || railName || title}
                  sourcePath={creatorSourcePath}
                  label={creatorLabel}
                  compact
                  appearance={appearance}
                />
              </div>
            </div>
          ) : null}

          {safeItems.length === 0 ? (
            <div
              className="mt-5 rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.03)] py-0 shadow-[0_14px_34px_rgba(8,6,20,0.2)]"
            >
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-white/70">
                  Nothing here yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="-mx-1 mt-5 flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar overscroll-x-contain [scrollbar-width:none]">
              {safeItems.map((item) => (
                <div
                  key={item.id}
                  className="w-[158px] shrink-0 sm:w-[188px] lg:w-[208px]"
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
        </div>
      </div>
    </section>
  );
}
