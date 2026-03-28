"use client";

import Link from "next/link";
import { useSimilarRecommendations } from "../../hooks/useAIRecommendations";
import Skeleton from "../common/Skeleton";
import Cover from "../common/Cover";
import SurfacePanel from "../common/SurfacePanel";
import { normalizeCoverBadge } from "../../lib/coverPresentation";

function getSeriesBadge(item) {
  if (String(item?.status || "").toLowerCase() === "completed") {
    return "Completed";
  }

  return normalizeCoverBadge(item?.badge);
}

export default function SimilarSeriesSection({ seriesId }) {
  const { data: similarSeries, loading, error } = useSimilarRecommendations(seriesId, 6);

  if (loading) {
    return (
      <SurfacePanel className="mt-8 space-y-4" appearance="light" accent="blue">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            More Series
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
            More to read.
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={`similar-${index}`} className="aspect-[2/3] rounded-[24px]" />
          ))}
        </div>
      </SurfacePanel>
    );
  }

  if (error || !similarSeries || similarSeries.length === 0) {
    return null;
  }

  return (
    <SurfacePanel className="mt-8 space-y-4" appearance="light" accent="blue">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          More Series
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
          More to read.
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {similarSeries.map((item) => (
          <Link
            key={item.id}
            href={`/series/${encodeURIComponent(item.id)}`}
            className="group overflow-hidden rounded-[26px] border border-black/6 bg-white text-left shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition-transform duration-300 hover:-translate-y-1 hover:border-black/10"
            aria-label={`Open ${item.title}`}
          >
            <Cover
              tone={item.coverTone}
              coverUrl={item.coverUrl}
              label={item.title}
              eyebrow={item.author || item.subtitle || "Series"}
              badge={getSeriesBadge(item)}
              className="aspect-[3/4] w-full"
            />
            <div className="space-y-2 p-4">
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-950">{item.title}</h3>
              <p className="line-clamp-1 text-xs text-slate-500">
                {item.author || item.subtitle || "Series"}
              </p>
              {Array.isArray(item.genres) && item.genres.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {item.genres.slice(0, 2).map((genre) => (
                    <span
                      key={`${item.id}-${genre}`}
                      className="rounded-full border border-black/8 bg-[#f8f9fc] px-2.5 py-1 text-[11px] text-slate-500"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </SurfacePanel>
  );
}
