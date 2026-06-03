"use client";

import SectionHeader from "./SectionHeader";
import StoryMiniCard from "./StoryMiniCard";

export default function ReadersRightNow({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Readers Right Now"
        description="What people are opening tonight"
        actionLabel="View All"
        actionHref="/rankings"
      />

      <div className="-mx-4 overflow-x-auto px-4 pb-2 no-scrollbar overscroll-x-contain [mask-image:linear-gradient(90deg,transparent_0,black_18px,black_calc(100%-18px),transparent_100%)] sm:mx-0 sm:px-0 sm:[mask-image:none]">
        <div className="grid min-w-max grid-flow-col auto-cols-[260px] gap-4 sm:auto-cols-[272px] lg:auto-cols-[284px] xl:min-w-0 xl:grid-flow-row xl:justify-between xl:[grid-template-columns:repeat(4,minmax(0,296px))]">
          {items.map((series, index) => (
            <StoryMiniCard
              key={series.id}
              series={series}
              href={`/series/${series.id}`}
              summary="A punchy opener, strong art, and the kind of cliffhanger people send to friends."
              eyebrow={Array.isArray(series?.genres) && series.genres.length > 0 ? series.genres[0] : "Reader pick"}
              sourceSection="home_readers_right_now"
              position={index + 1}
              variant="rail"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
