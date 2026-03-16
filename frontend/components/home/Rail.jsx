"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import CreatorShelfLinks from "../common/CreatorShelfLinks";
import PortraitCard from "./PortraitCard";
import { ensureArray } from "../../lib/validators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          {eyebrow ? (
            <Badge
              variant="outline"
              className="rounded-full border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200"
            >
              {eyebrow}
            </Badge>
          ) : null}
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white md:text-[1.9rem]">
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
        <Card className="rounded-[24px] border border-white/10 bg-white/[0.03] py-0 shadow-none">
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
        <Card className="rounded-[24px] border border-white/10 bg-black/20 py-0 shadow-none">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-neutral-500">Nothing is ready here yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {safeItems.map((item) => (
            <PortraitCard
              key={item.id}
              item={item}
              tone={tone}
              onClick={() => onItemClick?.(item, railName || title)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
