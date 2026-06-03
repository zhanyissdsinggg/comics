"use client";

import SectionHeader from "./SectionHeader";
import CoverRankCard from "./CoverRankCard";

export default function TrendingCovers({ items = [] }) {
  const displayItems = Array.isArray(items) ? items.slice(0, 6) : [];

  if (!displayItems.length) {
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

      <div className="-mx-4 overflow-x-auto px-4 pb-2 no-scrollbar overscroll-x-contain [mask-image:linear-gradient(90deg,transparent_0,black_18px,black_calc(100%-18px),transparent_100%)] md:mx-0 md:overflow-visible md:px-0 md:[mask-image:none]">
        <div className="grid min-w-max grid-flow-col auto-cols-[166px] gap-[18px] sm:auto-cols-[176px] md:min-w-0 md:grid-flow-row md:grid-cols-3 xl:[grid-template-columns:repeat(6,minmax(0,1fr))]">
          {displayItems.map((series, index) => (
            <CoverRankCard
              key={series.id}
              series={series}
              href={`/series/${series.id}`}
              badge={String(index + 1)}
              rank={index + 1}
              actionLabel=""
              sourceSection="home_trending_covers"
              position={index + 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
