"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Star } from "lucide-react";
import { useSimilarRecommendations } from "../../hooks/useAIRecommendations";
import Skeleton from "../common/Skeleton";
import SurfacePanel from "../common/SurfacePanel";
import StorefrontContinuationStrip from "../common/StorefrontContinuationStrip";

function getToneClass(tone) {
  if (tone === "warm") {
    return "from-orange-500/20 via-red-500/10 to-neutral-950";
  }
  if (tone === "cool") {
    return "from-sky-500/20 via-cyan-500/10 to-neutral-950";
  }
  if (tone === "dusk") {
    return "from-fuchsia-500/20 via-violet-500/10 to-neutral-950";
  }
  if (tone === "neon") {
    return "from-emerald-500/20 via-teal-500/10 to-neutral-950";
  }
  return "from-white/10 via-white/5 to-neutral-950";
}

export default function SimilarSeriesSection({ seriesId, series }) {
  const router = useRouter();
  const { data: similarSeries, loading, error } = useSimilarRecommendations(seriesId, 6);

  if (loading) {
    return (
      <SurfacePanel className="mt-8 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
            Similar series
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
            Readers who stopped here kept going.
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
    <SurfacePanel className="mt-8 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
            Similar series
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
            Readers who stopped here kept going.
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-neutral-300">
          <Sparkles size={14} className="text-emerald-300" />
          <span>AI-assisted recommendations</span>
        </div>
      </div>

      <StorefrontContinuationStrip
        series={series}
        similarItems={similarSeries}
        sourcePath={`/series/${seriesId}`}
        returnTo={`/series/${seriesId}`}
        entryPoint="SERIES_SIMILAR"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {similarSeries.map((series) => (
          <button
            key={series.id}
            type="button"
            onClick={() => router.push(`/series/${series.id}`)}
            className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-neutral-950 text-left shadow-[0_20px_70px_rgba(0,0,0,0.2)] transition-transform duration-300 hover:-translate-y-1 hover:border-white/20"
          >
            <div className={`aspect-[2/3] bg-gradient-to-br ${getToneClass(series.coverTone)}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <h3 className="line-clamp-2 text-sm font-semibold text-white">{series.title}</h3>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-neutral-300">
                {series.rating ? (
                  <span className="inline-flex items-center gap-1 text-amber-200">
                    <Star size={12} className="fill-current" />
                    <span>{Number(series.rating).toFixed(1)}</span>
                  </span>
                ) : <span>New pick</span>}
                {series.badge ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-white">
                    {series.badge}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </SurfacePanel>
  );
}
