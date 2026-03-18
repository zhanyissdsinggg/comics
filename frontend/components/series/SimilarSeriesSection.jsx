"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Star } from "lucide-react";
import { useSimilarRecommendations } from "../../hooks/useAIRecommendations";
import Skeleton from "../common/Skeleton";
import Cover from "../common/Cover";
import SurfacePanel from "../common/SurfacePanel";
import StorefrontContinuationStrip from "../common/StorefrontContinuationStrip";

export default function SimilarSeriesSection({ seriesId, series }) {
  const router = useRouter();
  const { data: similarSeries, loading, error } = useSimilarRecommendations(seriesId, 6);

  if (loading) {
    return (
      <SurfacePanel className="mt-8 space-y-4" appearance="light" accent="blue">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Similar series
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
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
    <SurfacePanel className="mt-8 space-y-4" appearance="light" accent="blue">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Similar series
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
            Readers who stopped here kept going.
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/84 px-3 py-1.5 text-xs text-slate-500">
          <Sparkles size={14} className="text-[var(--gush-accent,#2f6bff)]" />
          <span>Picked from reader patterns</span>
        </div>
      </div>

      <StorefrontContinuationStrip
        series={series}
        similarItems={similarSeries}
        sourcePath={`/series/${seriesId}`}
        returnTo={`/series/${seriesId}`}
        entryPoint="SERIES_SIMILAR"
        appearance="light"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {similarSeries.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(`/series/${item.id}`)}
            className="group overflow-hidden rounded-[26px] border border-black/6 bg-white text-left shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition-transform duration-300 hover:-translate-y-1 hover:border-black/10"
          >
            <div className="relative">
              <Cover
                tone={item.coverTone}
                coverUrl={item.coverUrl}
                className="aspect-[3/4] w-full"
              />
              {item.badge ? (
                <span className="absolute left-3 top-3 rounded-full border border-white/50 bg-white/88 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <div className="space-y-2 p-4">
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-950">{item.title}</h3>
              <p className="line-clamp-1 text-xs text-slate-500">
                {item.author || item.subtitle || "Recommended next"}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {item.rating ? (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <Star size={12} className="fill-current" />
                    <span>{Number(item.rating).toFixed(1)}</span>
                  </span>
                ) : (
                  <span>New pick</span>
                )}
                {item.subtitle ? <span>{item.subtitle}</span> : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </SurfacePanel>
  );
}
