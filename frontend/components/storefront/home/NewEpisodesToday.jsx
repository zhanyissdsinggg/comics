"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Flame } from "lucide-react";
import {
  storefrontHomeInteractiveCardClass,
  storefrontHomeSearchPillClass,
  storefrontHomeSectionEyebrowClass,
} from "../../common/StorefrontPagePrimitives";
import { resolveDisplayImageUrl } from "../../../lib/fallbackImage";
import { trackEvent } from "../../../lib/trackEvent";
import { buildReadHref } from "../landingUtils";
import {
  buildCardHook,
  buildGenreLabel,
  buildHomeUpdatedLabel,
  buildLatestInstallmentLabel,
} from "../landingUtils";
import SectionHeader from "./SectionHeader";

function EpisodeCard({ series, position }) {
  if (!series) {
    return null;
  }

  const coverUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });
  const coverPosition =
    String(
      series?.homeHeroArtwork?.position || series?.homeCoverArtwork?.position || "",
    ).trim() || "center 18%";

  return (
    <Link
      href={buildReadHref(series)}
      className="group block w-full shrink-0 scroll-snap-item"
      onClick={() =>
        trackEvent("story_click", {
          seriesId: series?.id,
          sourceSection: "home_new_episodes",
          position,
        })
      }
    >
      <article
        className={`${storefrontHomeInteractiveCardClass} flex min-h-[104px] gap-3 rounded-[20px] p-3`}
      >
        <div className="relative h-[84px] w-[68px] shrink-0 overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.08)]">
          <img
            src={coverUrl}
            alt={`Cover image for ${series.title} in new episodes position ${position}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            style={{ objectPosition: coverPosition }}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex min-h-[20px] items-center rounded-full bg-[linear-gradient(135deg,#ec4899_0%,#7c3aed_100%)] px-[7px] py-[2px] text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_rgba(236,72,153,0.24)]">
                  New
                </span>
                <p className={`${storefrontHomeSectionEyebrowClass} line-clamp-1`}>
                  {buildGenreLabel(series, 1) || "New drop"}
                </p>
              </div>
              <h3 className="mt-1 truncate text-[14px] font-black leading-[1.08] tracking-[-0.03em] text-[color:var(--gush-home-text-primary)]">
                {series.title}
              </h3>
            </div>
            <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#f9a8d4] transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>

          <p className="mt-2 line-clamp-2 text-[12px] leading-[1.45] text-[rgba(255,255,255,0.58)]">
            {buildCardHook(series, 72) ||
              "Fresh chapters just landed. Quick catch-up, then straight into the next obsession."}
          </p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-3">
            <div className="flex min-w-0 items-center gap-3 text-[12px] text-[color:var(--gush-home-text-muted)]">
              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                <Clock3 className="size-3.5 shrink-0" />
                {buildLatestInstallmentLabel(series)}
              </span>
              <span className="inline-flex min-w-0 items-center gap-1 truncate text-[rgba(255,255,255,0.62)]">
                <Flame className="size-3.5 shrink-0 text-[#fb923c]" />
                {buildHomeUpdatedLabel(series, position)}
              </span>
            </div>
            <span className={`${storefrontHomeSearchPillClass} min-h-[44px] px-3 text-xs text-white`}>
              Start Reading
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function NewEpisodesToday({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="New Episodes Today"
        description="Fresh chapters, hot off the press"
        actionLabel="View All"
        actionHref="/search?status=ongoing"
      />

      <div className="-mx-4 overflow-x-auto px-4 pb-2 no-scrollbar overscroll-x-contain [mask-image:linear-gradient(90deg,transparent_0,black_18px,black_calc(100%-18px),transparent_100%)] md:mx-0 md:px-0 md:[mask-image:none]">
        <div className="grid min-w-max grid-flow-col auto-cols-[272px] gap-4 sm:auto-cols-[288px] lg:min-w-0 lg:grid-flow-row lg:grid-cols-3">
          {items.map((series, index) => (
            <EpisodeCard
              key={series.id}
              series={series}
              position={index + 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
