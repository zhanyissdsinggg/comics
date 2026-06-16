"use client";

import { ArrowRight, Library } from "lucide-react";
import {
  storefrontHomeGlassCardClass,
  storefrontHomeSectionEyebrowClass,
} from "../../common/StorefrontPagePrimitives";
import { siteMaterialImages } from "../../../lib/siteMaterialAssets";
import { trackEvent } from "../../../lib/trackEvent";
import GradientButton from "./GradientButton";
import IconButton from "./IconButton";

export default function FeaturedHero({
  series,
  primaryHref,
  secondaryHref,
}) {
  if (!series) {
    return null;
  }

  const title = String(series?.title || "").trim();
  const description = "Open a story you'll keep thinking about.";
  const backgroundUrl = siteMaterialImages.homeFeaturedTodayHero;

  return (
    <section
      className={`${storefrontHomeGlassCardClass} relative min-h-[560px] overflow-hidden rounded-[30px] border-[rgba(255,255,255,0.10)] shadow-[0_32px_100px_rgba(0,0,0,0.42)] lg:h-[468px] lg:min-h-0 xl:h-[492px]`}
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
          role="presentation"
          className="h-full w-full scale-[1.02] object-cover object-[60%_center] opacity-[0.8] lg:object-[center_right]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,18,0.98)_0%,rgba(5,8,18,0.94)_30%,rgba(7,10,19,0.62)_56%,rgba(7,10,19,0.22)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(236,72,153,0.18),transparent_24%),radial-gradient(circle_at_28%_4%,rgba(124,58,237,0.24),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(56,189,248,0.10),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,19,0.12)_0%,rgba(7,10,19,0.26)_44%,rgba(7,10,19,0.58)_100%)]" />
      </div>

      <div className="relative min-h-[560px] p-5 sm:p-7 lg:flex lg:h-full lg:items-end lg:p-8 xl:p-9">
        <div className="relative z-20 flex min-h-[520px] max-w-[42rem] flex-col justify-end gap-4 pb-7 sm:min-h-[526px] sm:pb-8 lg:min-h-0 lg:gap-5 lg:pb-12">
          <div className="space-y-3 sm:space-y-4">
            <p className={storefrontHomeSectionEyebrowClass}>Featured Today</p>
            <h1 className="max-w-[9ch] font-display text-[2.72rem] font-black leading-[0.96] tracking-[-0.04em] text-[color:var(--gush-home-text-primary)] sm:text-[3.15rem] lg:text-[3.7rem] xl:text-[4.2rem]">
              {title}
            </h1>
            <p className="max-w-[34rem] text-[15px] leading-[1.68] text-[color:var(--gush-home-text-secondary)] sm:text-base">
              {description}
            </p>
          </div>

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
        </div>
      </div>
    </section>
  );
}
