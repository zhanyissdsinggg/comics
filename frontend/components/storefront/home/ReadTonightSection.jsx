"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { resolveDisplayImageUrl } from "../../../lib/fallbackImage";
import { siteMaterialImages } from "../../../lib/siteMaterialAssets";
import { trackEvent } from "../../../lib/trackEvent";
import {
  storefrontHomeSectionEyebrowClass,
} from "../../common/StorefrontPagePrimitives";
import {
  buildGenreLabel,
  normalizeType,
  uniqueBySeriesId,
} from "../landingUtils";
import SectionHeader from "./SectionHeader";

function buildEntryCards(items = [], rankings = []) {
  const pool = uniqueBySeriesId([...(Array.isArray(items) ? items : []), ...(Array.isArray(rankings) ? rankings : [])]);
  const comic = pool.find((series) => normalizeType(series?.type) === "comic") || pool[0] || null;
  const novel =
    pool.find((series) => normalizeType(series?.type) === "novel") ||
    pool.find((series) => series?.id !== comic?.id) ||
    comic;
  const discovery =
    pool.find(
      (series) => series?.id !== comic?.id && series?.id !== novel?.id,
    ) ||
    pool.find((series) => series?.id !== comic?.id) ||
    novel ||
    comic;

  return [
    {
      id: "comics",
      title: "Comics",
      subtitle: "Epic art. Fast reads.",
      href: "/comics",
      series: comic,
      gradient: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
      backgroundImageUrl: siteMaterialImages.homeReadTonightComics,
      glow:
        "radial-gradient(circle at 84% 18%, rgba(255,255,255,0.24), transparent 28%), radial-gradient(circle at 72% 78%, rgba(129,140,248,0.34), transparent 32%)",
      eyebrow: "Tonight's comic",
    },
    {
      id: "novels",
      title: "Novels",
      subtitle: "Dive deep. Get hooked.",
      href: "/novels",
      series: novel,
      gradient: "linear-gradient(135deg, #EC4899 0%, #FB7185 100%)",
      backgroundImageUrl: siteMaterialImages.homeReadTonightNovels,
      glow:
        "radial-gradient(circle at 86% 20%, rgba(255,255,255,0.22), transparent 26%), radial-gradient(circle at 76% 80%, rgba(251,191,202,0.3), transparent 34%)",
      eyebrow: "Tonight's novel",
    },
    {
      id: "discovery",
      title: "Discovery",
      subtitle: "Find your next obsession.",
      href: "/search",
      series: discovery,
      gradient: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)",
      backgroundImageUrl: siteMaterialImages.homeReadTonightDiscovery,
      glow:
        "radial-gradient(circle at 82% 18%, rgba(255,255,255,0.22), transparent 28%), radial-gradient(circle at 72% 80%, rgba(125,211,252,0.3), transparent 34%)",
      eyebrow: "Fresh discovery",
    },
  ];
}

function ReadTonightCard({ entry, position }) {
  const series = entry?.series;
  const coverUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });
  const metaLabel =
    series?.title ||
    buildGenreLabel(series, 1) ||
    "Tonight's pick";

  return (
    <Link
      href={entry.href}
      className="group relative block min-h-[128px] overflow-hidden rounded-[26px] p-6 shadow-[0_24px_48px_rgba(6,10,24,0.28)] transition-transform duration-200 hover:-translate-y-1"
      style={{
        backgroundImage: `linear-gradient(90deg,rgba(7,10,19,0.88)_0%,rgba(7,10,19,0.58)_48%,rgba(7,10,19,0.24)_100%), url("${entry.backgroundImageUrl}"), ${entry.glow}, ${entry.gradient}`,
        backgroundPosition: "left center, center right, center, center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover, cover, cover, cover",
      }}
      onClick={() =>
        trackEvent("story_click", {
          seriesId: series?.id || null,
          sourceSection: "home_read_tonight_entry",
          position,
          destination: entry.id,
        })
      }
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,10,19,0.08)_0%,rgba(7,10,19,0.02)_34%,rgba(7,10,19,0.22)_100%)]" />
      <div className="absolute -right-8 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-[rgba(255,255,255,0.16)] blur-3xl" />
      {coverUrl ? (
        <div className="absolute inset-y-3 right-3 w-[34%] min-w-[96px] overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.08)] shadow-[0_18px_40px_rgba(5,8,20,0.26)]">
          <img
            src={coverUrl}
            alt={`Spotlight artwork for ${metaLabel}`}
            className="h-full w-full object-cover opacity-70 mix-blend-screen transition-transform duration-500 group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0)),linear-gradient(270deg,rgba(255,255,255,0.02),rgba(7,10,19,0.44))]" />
        </div>
      ) : null}

      <div className="relative flex h-full min-h-[80px] max-w-[70%] flex-col justify-between sm:max-w-[68%]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgba(255,255,255,0.72)]">
            {entry.eyebrow}
          </p>
          <h3 className="mt-2 text-[24px] font-black leading-[0.96] tracking-[-0.05em] text-white sm:text-[26px]">
            {entry.title}
          </h3>
          <p className="mt-2 text-[13px] leading-[1.5] text-[rgba(255,255,255,0.82)]">
            {entry.subtitle}
          </p>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className={storefrontHomeSectionEyebrowClass}>{metaLabel}</p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.18)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-transform duration-200 group-hover:translate-x-0.5">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ReadTonightSection({
  items = [],
  suggestions = [],
  rankings = [],
}) {
  const entries = buildEntryCards(items, rankings);

  if (!entries.some((entry) => entry?.series) && !suggestions.length && !rankings.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Read Tonight"
        description="Choose your next read"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-[18px]">
        {entries.map((entry, index) => (
          <ReadTonightCard
            key={entry.id}
            entry={entry}
            position={index + 1}
          />
        ))}
      </div>
    </section>
  );
}
