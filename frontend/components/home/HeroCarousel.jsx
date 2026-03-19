/**
 * Hero carousel: editorial storefront lead with clearer CTA hierarchy.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { ensureArray } from "../../lib/validators";
import { trackEvent } from "../../lib/trackEvent";
import { useFollowStore } from "../../store/useFollowStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { normalizePlaceholdImageUrl } from "../../lib/normalizePlaceholdImageUrl";
import { getReadingCadenceLabel, STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import { getStorefrontCampaign } from "../../lib/storefrontCampaigns";
import Cover from "../common/Cover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TONE_GRADIENTS = {
  warm: "from-orange-950/95 via-rose-900/70 to-neutral-950",
  cool: "from-sky-950/95 via-cyan-900/60 to-neutral-950",
  dusk: "from-violet-950/95 via-indigo-900/60 to-neutral-950",
  neon: "from-emerald-950/95 via-teal-900/60 to-neutral-950",
  noir: "from-neutral-950 via-neutral-900/75 to-black",
  default: "from-neutral-950 via-neutral-900/75 to-black",
};

const META_PANEL_CLASS =
  "rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-sm";

function formatCount(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "Fresh";
  }

  return numeric >= 1000 ? `${(numeric / 1000).toFixed(1)}k` : numeric.toLocaleString();
}

export default function HeroCarousel({ items }) {
  const router = useRouter();
  const { followedSeriesIds, follow, unfollow } = useFollowStore();
  const { followSeries } = useBehaviorStore();
  const safeItems = useMemo(() => ensureArray(items), [items]);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const AUTO_PLAY_INTERVAL = 5000;
  const progressIntervalRef = useRef(null);
  const autoPlayTimeoutRef = useRef(null);

  const active = safeItems[index] || safeItems[0];
  const activeSeriesId = String(active?.seriesId || "").trim();
  const isFollowing = activeSeriesId ? followedSeriesIds.includes(activeSeriesId) : false;
  const rawBannerUrl = active?.bannerUrl || active?.coverUrl;
  const bannerUrl = normalizePlaceholdImageUrl(rawBannerUrl);
  const gradient = TONE_GRADIENTS[active?.coverTone] || TONE_GRADIENTS.default;
  const campaign = getStorefrontCampaign(active);
  const activeSeriesHref = activeSeriesId ? `/series/${encodeURIComponent(activeSeriesId)}` : "#";
  const heroSignals = useMemo(
    () =>
      Array.from(
        new Set(
          [
            active?.hasFreeEpisodes
              ? `${STOREFRONT_TERMS.freeStart}${
                  active?.freeEpisodeCount ? ` / ${active.freeEpisodeCount} free episodes` : ""
                }`
              : "Premium unlock",
            active?.status ? getReadingCadenceLabel(active.status) : "Staff pick",
            campaign?.eyebrow || "Featured now",
          ].filter(Boolean),
        ),
      ),
    [
      active?.freeEpisodeCount,
      active?.hasFreeEpisodes,
      active?.status,
      campaign?.eyebrow,
    ],
  );

  const handlePrev = useCallback(() => {
    setIndex((prev) => (prev - 1 + safeItems.length) % safeItems.length);
    setProgress(0);
  }, [safeItems.length]);

  const handleNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % safeItems.length);
    setProgress(0);
  }, [safeItems.length]);

  const handleReadNow = useCallback(() => {
    if (!activeSeriesId) {
      return;
    }

    trackEvent("hero_read_now", {
      seriesId: activeSeriesId,
    });
    router.push(`/series/${activeSeriesId}`);
  }, [activeSeriesId, router]);

  const handleFollowToggle = useCallback(async () => {
    if (!activeSeriesId) {
      return;
    }
    if (isFollowing) {
      await unfollow(activeSeriesId);
      trackEvent("hero_unfollow", { seriesId: activeSeriesId });
      return;
    }

    const response = await follow(activeSeriesId);
    if (response?.ok) {
      followSeries(activeSeriesId);
      trackEvent("hero_follow", { seriesId: activeSeriesId });
    }
  }, [activeSeriesId, follow, followSeries, isFollowing, unfollow]);

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (event) => {
    touchEndX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const delta = touchStartX.current - touchEndX.current;
    if (delta > 50) {
      handleNext();
    } else if (delta < -50) {
      handlePrev();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
    setIsPaused(false);
  };

  useEffect(() => {
    if (safeItems.length <= 1 || isPaused) {
      return undefined;
    }

    progressIntervalRef.current = setInterval(() => {
      setProgress((value) => {
        const nextValue = value + (50 / AUTO_PLAY_INTERVAL) * 100;
        return nextValue >= 100 ? 100 : nextValue;
      });
    }, 50);

    autoPlayTimeoutRef.current = setTimeout(() => {
      setIndex((prev) => (prev + 1) % safeItems.length);
      setProgress(0);
    }, AUTO_PLAY_INTERVAL);

    return () => {
      clearInterval(progressIntervalRef.current);
      clearTimeout(autoPlayTimeoutRef.current);
    };
  }, [index, isPaused, safeItems.length]);

  if (safeItems.length === 0) {
    return null;
  }

  return (
    <section
      className="relative overflow-hidden rounded-[32px] border border-white/10 bg-neutral-950 shadow-[0_28px_120px_rgba(0,0,0,0.3)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0">
        {bannerUrl ? (
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-700"
            style={{ backgroundImage: `url(${bannerUrl})` }}
            aria-hidden="true"
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
        )}
        <div className={cn("absolute inset-0 bg-gradient-to-r", gradient)} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_20%),linear-gradient(180deg,rgba(7,10,16,0.08),rgba(7,10,16,0.78))]" />
      </div>

      <div className="relative z-10 grid min-h-[430px] gap-6 p-5 sm:p-6 lg:min-h-[520px] lg:grid-cols-[1.12fr_0.88fr] lg:p-8">
        <div className="flex flex-col justify-end">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full bg-white px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-950">
                Featured
              </Badge>
              {active?.badge ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-white/15 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white"
                >
                  {active.badge}
                </Badge>
              ) : null}
              {heroSignals.slice(0, 2).map((signal) => (
                <Badge
                  key={signal}
                  variant="outline"
                  className="rounded-full border-white/15 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-100"
                >
                  {signal}
                </Badge>
              ))}
            </div>

            <h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-[0.96] tracking-tight text-white sm:text-5xl lg:text-[3.8rem]">
              {active?.title}
            </h2>

            {active?.description ? (
              <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-200 sm:text-base">
                {active.description}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-neutral-200/85">
              {active?.author ? <span>By {active.author}</span> : null}
              {Array.isArray(active?.genres) && active.genres.length > 0 ? (
                <span>{active.genres.slice(0, 3).join(" / ")}</span>
              ) : null}
            </div>

            {campaign?.heroNote ? (
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/90">
                {campaign.heroNote}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                size="lg"
                onClick={handleReadNow}
                className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
              >
                {active?.hasFreeEpisodes
                  ? "Read free start"
                  : campaign?.id === "binge-ready"
                    ? "Open binge pick"
                    : "Open series"}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => {
                  void handleFollowToggle();
                }}
                className="h-11 rounded-full border-white/15 bg-white/[0.06] px-5 text-sm font-semibold text-white hover:border-white/25 hover:bg-white/[0.1]"
              >
                {isFollowing ? <Check className="size-4" /> : null}
                {isFollowing ? "Following" : "+ Follow"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4">
          {safeItems.length > 1 ? (
            <div className="hidden justify-end gap-2 lg:flex">
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={handlePrev}
                aria-label="Previous slide"
                className="rounded-full border-white/15 bg-black/25 text-white hover:border-white/25 hover:bg-white/[0.08]"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={handleNext}
                aria-label="Next slide"
                className="rounded-full border-white/15 bg-black/25 text-white hover:border-white/25 hover:bg-white/[0.08]"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : (
            <div />
          )}

          <div className="ml-auto w-full max-w-[360px]">
            <Link
              href={activeSeriesHref}
              onClick={() => {
                if (!activeSeriesId) {
                  return;
                }
                trackEvent("hero_snapshot_open", { seriesId: activeSeriesId });
              }}
              aria-label={active?.title ? `Open ${active.title}` : "Open featured series"}
              className="group block rounded-[28px] border border-white/10 bg-black/35 p-4 shadow-[0_22px_80px_rgba(0,0,0,0.26)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5 hover:border-white/20"
            >
              <div className="grid gap-4 sm:grid-cols-[132px_1fr] lg:grid-cols-1">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900">
                  <Cover
                    tone={active?.coverTone}
                    coverUrl={active?.coverUrl}
                    label={active?.title}
                    eyebrow={campaign?.eyebrow || "Featured"}
                    badge={active?.badge}
                    className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                      Series snapshot
                    </p>
                    <p className="mt-2 text-xl font-semibold text-white">{active?.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={META_PANEL_CLASS}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                        Rating
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {Number(active?.rating || 0).toFixed(1)}
                      </p>
                    </div>
                    <div className={META_PANEL_CLASS}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                        Audience
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatCount(active?.followers || active?.views)}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-neutral-300">
                    {active?.hasFreeEpisodes
                      ? `${active?.freeEpisodeCount || 0} free episodes available before unlock.`
                      : "Premium unlock path ready for committed readers."}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 bg-black/30 px-5 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 md:grid-cols-3 lg:flex-1">
            {heroSignals.map((signal) => (
              <div key={signal} className={META_PANEL_CLASS}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Signal
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{signal}</p>
              </div>
            ))}
          </div>

          {safeItems.length > 1 ? (
            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div className="flex items-center gap-1.5">
                {safeItems.map((_, itemIndex) => (
                  <button
                    key={itemIndex}
                    type="button"
                    onClick={() => {
                      setIndex(itemIndex);
                      setProgress(0);
                    }}
                    aria-label={`Slide ${itemIndex + 1}`}
                    className="relative h-2 overflow-hidden rounded-full transition-all duration-300"
                    style={{
                      width: itemIndex === index ? 36 : 8,
                      background:
                        itemIndex === index ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.26)",
                    }}
                  >
                    {itemIndex === index ? (
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-white"
                        style={{ width: `${progress}%`, transition: "width 50ms linear" }}
                      />
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 lg:hidden">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={handlePrev}
                  aria-label="Previous slide"
                  className="rounded-full border-white/15 bg-black/25 text-white hover:border-white/25 hover:bg-white/[0.08]"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={handleNext}
                  aria-label="Next slide"
                  className="rounded-full border-white/15 bg-black/25 text-white hover:border-white/25 hover:bg-white/[0.08]"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
