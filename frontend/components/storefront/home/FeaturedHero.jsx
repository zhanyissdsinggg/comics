"use client";

import { ArrowRight, Library, Sparkles } from "lucide-react";
import {
  storefrontHomeGlassCardClass,
  storefrontHomeSectionEyebrowClass,
} from "../../common/StorefrontPagePrimitives";
import { resolveDisplayImageUrl } from "../../../lib/fallbackImage";
import { trackEvent } from "../../../lib/trackEvent";
import { buildCreatorLabel } from "../landingUtils";
import GenreChip from "./GenreChip";
import GradientButton from "./GradientButton";
import IconButton from "./IconButton";

export default function FeaturedHero({
  series,
  primaryHref,
  secondaryHref,
  chips = [],
  stats = [],
}) {
  if (!series) {
    return null;
  }

  const title = String(series?.title || "").trim();
  const creator = buildCreatorLabel(series);
  const description = "Open a story you'll keep thinking about.";
  const backgroundUrl = resolveDisplayImageUrl(
    series?.bannerUrl || series?.coverUrl,
    {
      kind: series?.bannerUrl ? "banner" : "cover",
      adult: series?.adult || series?.isAdult,
    },
  );
  const posterUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });
  const compactStats = Array.isArray(stats) ? stats.slice(0, 3) : [];

  return (
    <section
      className={`${storefrontHomeGlassCardClass} relative min-h-[520px] overflow-hidden rounded-[30px] border-[rgba(255,255,255,0.10)] shadow-[0_32px_100px_rgba(0,0,0,0.42)] lg:h-[408px] lg:min-h-0 xl:h-[432px]`}
      style={{
        borderRadius: "30px",
        borderColor: "rgba(255,255,255,0.10)",
        boxShadow: "0 32px 100px rgba(0,0,0,0.42)",
      }}
    >
      <div className="absolute inset-0">
        <img
          src={backgroundUrl}
          alt=""
          aria-hidden="true"
          className="h-full w-full scale-[1.03] object-cover object-[72%_center] opacity-[0.54] lg:object-right"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,10,19,0.97)_0%,rgba(7,10,19,0.82)_34%,rgba(7,10,19,0.38)_62%,rgba(7,10,19,0.18)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(236,72,153,0.34),transparent_24%),radial-gradient(circle_at_28%_4%,rgba(124,58,237,0.30),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(56,189,248,0.16),transparent_24%)]" />
        <div className="absolute left-[-10%] top-[18%] h-[44%] w-[32%] rounded-full bg-[rgba(124,58,237,0.18)] blur-[110px]" />
        <div className="absolute bottom-[-10%] right-[6%] h-[38%] w-[26%] rounded-full bg-[rgba(236,72,153,0.12)] blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,19,0.06)_0%,rgba(7,10,19,0.22)_42%,rgba(7,10,19,0.54)_100%)]" />
      </div>

      <div className="relative min-h-[520px] p-5 sm:p-7 lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end lg:gap-8 lg:p-8 xl:grid-cols-[minmax(0,1fr)_344px] xl:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-5 z-10 w-[150px] sm:right-6 sm:top-6 sm:w-[182px] lg:static lg:order-2 lg:flex lg:w-full lg:justify-end"
        >
          <div className="relative ml-auto w-full max-w-[150px] sm:max-w-[182px] lg:max-w-[320px] xl:max-w-[344px]">
            <div className="absolute inset-6 rounded-[26px] bg-[rgba(236,72,153,0.18)] blur-3xl" />
            <div className="absolute inset-5 rounded-[24px] bg-[rgba(124,58,237,0.16)] blur-3xl" />
            <div className="absolute inset-3 -rotate-[5deg] rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.028)]" />
            <div className="absolute inset-2 rotate-[4deg] rounded-[24px] border border-white/8 bg-[rgba(236,72,153,0.08)]" />
            <div className="relative aspect-[0.72] overflow-hidden rounded-[24px] border border-white/12 shadow-[0_28px_82px_rgba(0,0,0,0.52)]">
              <img
                src={posterUrl}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,transparent_20%,rgba(0,0,0,0.58)_100%)]" />
              <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(7,10,19,0.66)] px-3 py-1.5 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--gush-home-text-muted)]">
                  <Sparkles className="size-3.5 text-[var(--gush-warning)]" />
                  Artwork Spotlight
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-20 flex min-h-[480px] flex-col justify-end gap-4 pt-[228px] pb-1 sm:min-h-[486px] sm:pt-[252px] lg:order-1 lg:min-h-0 lg:max-w-[41rem] lg:justify-end lg:gap-5 lg:pt-0">
          <div className="space-y-3 sm:space-y-4">
            <p className={storefrontHomeSectionEyebrowClass}>Featured Today</p>
            <h1 className="max-w-[9ch] font-display text-[2.72rem] font-black leading-[0.96] tracking-[-0.04em] text-[color:var(--gush-home-text-primary)] sm:text-[3.15rem] lg:text-[3.7rem] xl:text-[4.2rem]">
              {title}
            </h1>
            <p className="max-w-[34rem] text-[15px] leading-[1.68] text-[color:var(--gush-home-text-secondary)] sm:text-base">
              {description}
            </p>
            {creator ? (
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[rgba(255,255,255,0.60)]">
                by {creator}
              </p>
            ) : null}
          </div>

          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <GenreChip key={`hero-${chip}`} label={chip} tone="ghost" />
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <GradientButton
              href={primaryHref}
              data-testid="home-hero-primary-cta"
              icon={ArrowRight}
              className="min-h-[48px] rounded-full px-6 shadow-[0_18px_46px_rgba(236,72,153,0.28)]"
              onClick={() =>
                trackEvent("story_click", {
                  seriesId: series?.id,
                  sourceSection: "home_featured_hero_primary",
                  position: 1,
                })
              }
            >
              Start Reading
            </GradientButton>
            <IconButton
              href={secondaryHref}
              icon={Library}
              className="min-h-[48px] rounded-full px-5 text-white"
              onClick={() =>
                trackEvent("story_click", {
                  seriesId: series?.id,
                  sourceSection: "home_featured_hero_secondary",
                  position: 1,
                })
              }
            >
              View Series
            </IconButton>
          </div>

          {compactStats.length > 0 ? (
            <div className="hidden gap-2.5 sm:flex sm:flex-wrap">
              {compactStats.map((stat) => (
                <div
                  key={stat.label}
                  className={`${storefrontHomeGlassCardClass} inline-flex min-h-[42px] items-center gap-2 rounded-full bg-[rgba(7,10,19,0.56)] px-4 py-2.5`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--gush-home-text-muted)]">
                    {stat.label}
                  </p>
                  <p className="text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--gush-home-text-primary)]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
