"use client";

import SectionHeader from "./SectionHeader";
import CoverCard from "./CoverCard";

export default function TrendingCovers({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Trending Covers"
        description="Most opened tonight"
        actionLabel="View All"
        actionHref="/rankings"
      />

      <div className="-mx-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-3.5 sm:gap-4">
          {items.map((series, index) => (
            <CoverCard
              key={series.id}
              series={series}
              href={`/series/${series.id}`}
              badge={String(index + 1)}
              actionLabel="Open now"
              sourceSection="home_trending_covers"
              position={index + 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
