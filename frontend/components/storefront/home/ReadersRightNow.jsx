"use client";

import SectionHeader from "./SectionHeader";
import StoryCard from "./StoryCard";

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

      <div className="-mx-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
        <div className="grid min-w-max gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((series, index) => (
            <div
              key={series.id}
              className="w-[calc(100vw-2.5rem)] max-w-[360px] sm:w-auto sm:max-w-none"
            >
              <StoryCard
                series={series}
                href={`/series/${series.id}`}
                badge={index === 0 ? "Hot" : `${index + 1}`}
                summary="A punchy opener, strong art, and the kind of cliffhanger people send to friends."
                ctaLabel="View Series"
                sourceSection="home_readers_right_now"
                position={index + 1}
                compact
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
