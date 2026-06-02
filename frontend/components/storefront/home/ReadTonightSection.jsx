"use client";

import Link from "next/link";
import { ArrowUpRight, Search, Trophy } from "lucide-react";
import {
  storefrontInfoCardClass,
  storefrontSoftCardClass,
} from "../../common/StorefrontPagePrimitives";
import { buildReadHref } from "../landingUtils";
import GenreChip from "./GenreChip";
import SectionHeader from "./SectionHeader";
import StoryCard from "./StoryCard";

function SearchSuggestionPanel({ suggestions = [] }) {
  return (
    <div className={`${storefrontSoftCardClass} p-4`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/44">
        <Search className="size-4" />
        Search suggestions
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.length > 0 ? (
          suggestions.map((item) => (
            <Link
              key={item.value}
              href={`/search?q=${encodeURIComponent(item.value)}`}
            >
              <GenreChip label={item.label} tone="ghost" />
            </Link>
          ))
        ) : (
          <p className="text-sm text-white/58">
            Search by title, genre, or whatever vibe you want tonight.
          </p>
        )}
      </div>
    </div>
  );
}

function RankingsPreview({ items = [] }) {
  return (
    <div className={`${storefrontInfoCardClass} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/44">
          <Trophy className="size-4" />
          Rankings preview
        </div>
        <Link
          href="/rankings"
          className="inline-flex items-center gap-1 text-xs font-medium text-white/58 transition-colors hover:text-white"
        >
          View all
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-2.5">
        {items.slice(0, 5).map((series, index) => (
          <Link
            key={series.id}
            href={`/series/${series.id}`}
            className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 rounded-[18px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.025)_100%)] px-3 py-2.5 shadow-[0_14px_30px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/16 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)]"
          >
            <span className="text-center font-display text-[1.3rem] font-semibold text-white/78">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {series.title}
              </p>
              <p className="truncate text-xs text-white/54">
                {series?.type || "Series"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ReadTonightSection({
  items = [],
  suggestions = [],
  rankings = [],
}) {
  if (!items.length && !suggestions.length && !rankings.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Read Tonight"
        description="Choose your next read"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <div className="-mx-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
          <div className="grid min-w-max gap-3 md:grid-cols-2">
            {items.slice(0, 4).map((series, index) => (
              <div
                key={series.id}
                className="w-[calc(100vw-2.5rem)] max-w-[360px] md:w-auto md:max-w-none"
              >
                <StoryCard
                  series={series}
                  href={buildReadHref(series)}
                  badge={index === 0 ? "Tonight's Pick" : ""}
                  summary="One good opener, one bad decision, then your evening is gone."
                  ctaLabel="Start Reading"
                  sourceSection="home_read_tonight"
                  position={index + 1}
                  compact
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <SearchSuggestionPanel suggestions={suggestions.slice(0, 6)} />
          <RankingsPreview items={rankings} />
        </div>
      </div>
    </section>
  );
}
