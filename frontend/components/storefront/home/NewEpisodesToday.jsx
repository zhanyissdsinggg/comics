"use client";

import { buildReadHref } from "../landingUtils";
import SectionHeader from "./SectionHeader";
import StoryCard from "./StoryCard";

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

      <div className="-mx-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
        <div className="grid min-w-max gap-3 lg:grid-cols-3">
          {items.map((series, index) => (
            <div
              key={series.id}
              className="w-[82vw] max-w-[360px] lg:w-auto lg:max-w-none"
            >
              <StoryCard
                series={series}
                href={buildReadHref(series)}
                badge="New"
                summary="Fresh chapters just landed. Quick catch-up, then straight into the next obsession."
                ctaLabel="Start Reading"
                sourceSection="home_new_episodes"
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
