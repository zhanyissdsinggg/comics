"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import CreatorShelfLinks from "../common/CreatorShelfLinks";
import PortraitCard from "./PortraitCard";
import { ensureArray } from "../../lib/validators";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  eyebrow,
  title,
  items,
  tone,
  railName,
  onItemClick,
  reason,
  href = "",
  ctaLabel = "See All",
  showCreatorShelfLinks = false,
  creatorEntryPoint = "CREATOR_CHIP",
  creatorCampaignId = "",
  creatorSourcePath = "/",
  creatorLabel = "More from these creators",
}) {
  const router = useRouter();
  const safeItems = ensureArray(items);
  const railSurface = RAIL_SURFACE_BY_ID[railName] || RAIL_SURFACE_BY_ID.default;

  return (
    <section>
      <Card className={cn("relative overflow-hidden rounded-[32px] py-0 shadow-[0_24px_90px_rgba(0,0,0,0.24)]", railSurface)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,transparent,rgba(255,255,255,0.02))]" />
        <CardContent className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {eyebrow ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200"
                  >
                    {eyebrow}
                  </Badge>
                ) : null}
                <Badge
                  variant="outline"
                  className="rounded-full border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-300"
                >
                  {safeItems.length} picks
                </Badge>
              </div>

              <div className="space-y-2">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white md:text-[1.95rem]">
                  {title}
                </h2>
                {reason ? <p className="max-w-3xl text-sm leading-6 text-neutral-400">{reason}</p> : null}
              </div>
            </div>

            {href ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push(href)}
                className="h-10 justify-start gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.06]"
              >
                {ctaLabel}
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>

          {showCreatorShelfLinks && safeItems.length > 0 ? (
            <Card className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] py-0 shadow-none">
              <CardContent className="p-4">
                <CreatorShelfLinks
                  items={safeItems}
                  entryPoint={creatorEntryPoint}
                  campaignId={creatorCampaignId || railName || title}
                  sourcePath={creatorSourcePath}
                  label={creatorLabel}
                  compact
                />
              </CardContent>
            </Card>
          ) : null}

          {safeItems.length === 0 ? (
            <Card className="mt-5 rounded-[24px] border border-white/10 bg-black/20 py-0 shadow-none">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-neutral-500">Nothing is ready here yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="-mx-1 mt-5 flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar">
              {safeItems.map((item) => (
                <div key={item.id} className="w-[164px] shrink-0 sm:w-[188px] lg:w-[208px]">
                  <PortraitCard
                    item={item}
                    tone={tone}
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
