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
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
  },
  continue: {
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
  },
  trending: {
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
  },
  completed: {
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
  },
  new: {
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
  },
  ttf: {
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
  },
  adult: {
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
  },
  history: {
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
  },
  starter: {
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
  },
  "ai-recommended": {
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
  },
  recommended: {
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
  },
  default: {
    darkAccent: "text-white/65",
    darkPanel: "border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
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
        <Card
        className={cn(
          "relative overflow-hidden rounded-[26px] border py-0",
          railTheme.darkPanel,
        )}
      >
        <CardContent className="relative p-5 sm:p-6">
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
                className="h-10 justify-start gap-2 rounded-full border-2 border-black bg-[#00E5FF] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5"
              >
                {ctaLabel}
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>

          {showCreatorShelfLinks && safeItems.length > 0 ? (
            <Card
              className="mt-5 rounded-[22px] border-2 border-black bg-black py-0 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
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
              className="mt-5 rounded-[22px] border-2 border-black bg-black py-0 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            >
              <CardContent className="p-8 text-center">
                <p className="text-sm font-semibold text-white/70">
                  Nothing here yet.
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
