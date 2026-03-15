/**
 * HeroCarousel - ?? Webtoon/Lezhin ??? Hero Banner
 * ?? + ?????? + ??????????
 * ?????? + ???? + ?????
 */
"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ensureArray } from "../../lib/validators";
import { trackEvent } from "../../lib/trackEvent";
import { useFollowStore } from "../../store/useFollowStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { getReadingCadenceLabel, STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import { getStorefrontCampaign } from "../../lib/storefrontCampaigns";

function normalizeBannerUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "placehold.co" && !parsed.pathname.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
      parsed.pathname = parsed.pathname + ".png";
      return parsed.toString();
    }
  } catch {
    // ignore malformed urls from legacy content
  }
  return url;
}

const TONE_GRADIENTS = {
  warm: "from-orange-900/90 via-red-900/60",
  cool: "from-blue-900/90 via-cyan-900/60",
  dusk: "from-purple-900/90 via-indigo-900/60",
  neon: "from-emerald-900/90 via-teal-900/60",
  noir: "from-neutral-900/90 via-neutral-800/60",
  default: "from-neutral-900/90 via-neutral-800/60",
};

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
  const bannerUrl = normalizeBannerUrl(rawBannerUrl);
  const coverUrl = normalizeBannerUrl(active?.coverUrl);
  const gradient = TONE_GRADIENTS[active?.coverTone] || TONE_GRADIENTS.default;
  const campaign = getStorefrontCampaign(active);
  const heroSignals = [
    active?.hasFreeEpisodes
      ? `${STOREFRONT_TERMS.freeStart}${
          active?.freeEpisodeCount ? ` | ${active.freeEpisodeCount} free episodes` : ""
        }`
      : null,
    active?.status ? getReadingCadenceLabel(active.status) : null,
    campaign?.eyebrow && !active?.hasFreeEpisodes ? campaign.eyebrow : null,
  ].filter(Boolean);

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
    const target = "/series/" + activeSeriesId;
    trackEvent("hero_read_now", {
      seriesId: activeSeriesId,
    });
    router.push(target);
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
      className="relative overflow-hidden rounded-2xl bg-neutral-900"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative aspect-[21/9] w-full overflow-hidden sm:aspect-[21/8] md:aspect-[21/7]">
        {bannerUrl ? (
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-700"
            style={{ backgroundImage: "url(" + bannerUrl + ")" }}
            aria-hidden="true"
          />
        ) : (
          <div className={"absolute inset-0 bg-gradient-to-br " + gradient + " to-neutral-950"} />
        )}

        <div className={"absolute inset-0 bg-gradient-to-r " + gradient + " to-transparent"} />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent" />

        <div className="absolute inset-0 z-20 flex items-end p-5 md:items-center md:p-10">
          <div className="flex w-full items-end justify-between gap-6 md:items-center">
            <div className="max-w-xs space-y-3 md:max-w-sm lg:max-w-md">
              <div className="flex items-center gap-2">
                <span className="rounded-sm bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                  Featured
                </span>
                {active?.badge ? (
                  <span className="rounded-sm bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
                    {active.badge}
                  </span>
                ) : null}
              </div>

              <h2 className="text-2xl font-black leading-tight tracking-tight text-white drop-shadow-lg md:text-4xl lg:text-5xl">
                {active?.title}
              </h2>

              {active?.description ? (
                <p className="line-clamp-2 text-sm leading-relaxed text-white/70 md:text-base">
                  {active.description}
                </p>
              ) : null}

              {campaign?.heroNote ? (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/85">
                  {campaign.heroNote}
                </p>
              ) : null}

              {heroSignals.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {heroSignals.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-100 backdrop-blur-sm"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleReadNow}
                  className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/40 active:scale-95"
                >
                  {active?.hasFreeEpisodes
                    ? "Read free start"
                    : campaign?.id === "binge-ready"
                      ? "Open binge pick"
                      : "Open series"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleFollowToggle();
                  }}
                  className="rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
                >
                  {isFollowing ? "Following" : "+ Follow"}
                </button>
              </div>
            </div>

            {coverUrl ? (
              <div className="hidden shrink-0 md:block">
                <div className="relative h-48 w-32 overflow-hidden rounded-xl shadow-2xl shadow-black/60 ring-1 ring-white/10 lg:h-56 lg:w-40">
                  <Image
                    src={coverUrl}
                    alt={active?.title || ""}
                    fill
                    className="object-cover"
                    sizes="160px"
                    priority
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {safeItems.length > 1 ? (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous"
              className="absolute left-0 top-0 z-10 h-full w-14 cursor-w-resize md:w-20"
            />
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next"
              className="absolute right-0 top-0 z-10 h-full w-14 cursor-e-resize md:w-20"
            />
          </>
        ) : null}
      </div>

      {safeItems.length > 1 ? (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
          {safeItems.map((_, itemIndex) => (
            <button
              key={itemIndex}
              type="button"
              onClick={() => {
                setIndex(itemIndex);
                setProgress(0);
              }}
              aria-label={"Slide " + (itemIndex + 1)}
              className="relative overflow-hidden rounded-full transition-all duration-300"
              style={{
                width: itemIndex === index ? "24px" : "6px",
                height: "6px",
                background: itemIndex === index ? "transparent" : "rgba(255,255,255,0.3)",
              }}
            >
              {itemIndex === index ? (
                <span className="absolute inset-0 rounded-full bg-white/30">
                  <span
                    className="absolute left-0 top-0 h-full rounded-full bg-white"
                    style={{ width: progress + "%", transition: "width 50ms linear" }}
                  />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
