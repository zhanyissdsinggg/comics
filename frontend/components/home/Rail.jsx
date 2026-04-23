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
    lightAccent: "text-black/55",
    lightPanel: "border-black bg-white",
  },
  continue: {
    lightAccent: "text-black/55",
    lightPanel: "border-black bg-white",
  },
  trending: {
    lightAccent: "text-black/65",
    lightPanel: "border-black bg-white",
  },
  completed: {
    lightAccent: "text-black/65",
    lightPanel: "border-black bg-white",
  },
  new: {
    lightAccent: "text-black/55",
    lightPanel: "border-black bg-white",
  },
  ttf: {
    lightAccent: "text-black/65",
    lightPanel: "border-black bg-white",
  },
  adult: {
    lightAccent: "text-[#ff007a]",
    lightPanel: "border-black bg-white",
  },
  history: {
    lightAccent: "text-black/65",
    lightPanel: "border-black bg-[#fff6cf]",
  },
  starter: {
    lightAccent: "text-black/55",
    lightPanel: "border-black bg-white",
  },
  "ai-recommended": {
    lightAccent: "text-black/55",
    lightPanel: "border-black bg-white",
  },
  recommended: {
    lightAccent: "text-black/65",
    lightPanel: "border-black bg-[#dffcff]",
  },
  default: {
    lightAccent: "text-black/60",
    lightPanel: "border-black bg-[#fff6cf]",
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
        className={cn(
          "relative overflow-hidden rounded-[32px] border-[3px] py-0 shadow-[8px_8px_0_0_rgba(0,0,0,1)]",
          railTheme.lightPanel,
        )}
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
                  "font-display text-2xl font-black uppercase tracking-[-0.05em] md:text-[1.95rem]",
                  "text-black",
                )}
              >
                {title}
              </h2>
              {reason ? (
                <p
                  className={cn(
                    "max-w-2xl text-sm leading-7",
                    "text-black/68",
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
                className="h-10 justify-start gap-2 rounded-full border-[3px] border-black bg-white px-4 text-sm font-semibold uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:shadow-none"
              >
                {ctaLabel}
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>

          {showCreatorShelfLinks && safeItems.length > 0 ? (
            <Card
              className="mt-5 rounded-[24px] border-[3px] border-black bg-white py-0 shadow-[5px_5px_0_0_rgba(0,0,0,1)]"
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
              className="mt-5 rounded-[24px] border-[3px] border-black bg-[#fff6cf] py-0 shadow-[5px_5px_0_0_rgba(0,0,0,1)]"
            >
              <CardContent className="p-8 text-center">
                <p className="text-sm font-semibold text-black/55">
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
