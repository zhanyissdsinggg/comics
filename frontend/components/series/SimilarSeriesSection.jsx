"use client";

import Link from "next/link";
import { useSimilarRecommendations } from "../../hooks/useAIRecommendations";
import Skeleton from "../common/Skeleton";
import Cover from "../common/Cover";
import SurfacePanel from "../common/SurfacePanel";
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";

function getSeriesBadge(item) {
  if (String(item?.status || "").toLowerCase() === "completed") {
    return "Finished";
  }

  const updatedAtMs = Date.parse(item?.updatedAt || 0);
  if (
    !Number.isNaN(updatedAtMs) &&
    updatedAtMs >= Date.now() - 14 * 24 * 60 * 60 * 1000
  ) {
    return "Updated";
  }

  const episodeCount = Math.max(0, Number(item?.episodeCount || 0));
  if (episodeCount > 0 && episodeCount <= 12) {
    return "Top Pick";
  }

  return "";
}

export default function SimilarSeriesSection({ seriesId }) {
  const {
    data: similarSeries,
    loading,
    error,
  } = useSimilarRecommendations(seriesId, 6);
  const cardClass =
    "group overflow-hidden rounded-[28px] border-[3px] border-white/20 bg-black text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5";
  const chipClass =
    "rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]";

  if (loading) {
    return (
      <SurfacePanel className="mt-8 space-y-4" appearance="dark" accent="cyan">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
            More stories
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.06em] text-white">
            More to try.
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-12">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={`similar-${index}`}
              className={`rounded-[24px] ${index === 0 ? "aspect-[1.2/1.35] md:col-span-2 xl:col-span-4" : "aspect-[2/3] xl:col-span-2"}`}
            />
          ))}
        </div>
      </SurfacePanel>
    );
  }

  if (error || !similarSeries || similarSeries.length === 0) {
    return null;
  }

  return (
    <SurfacePanel className="mt-8 space-y-5" appearance="dark" accent="cyan">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
            More stories
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.06em] text-white">
            More to try.
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-12">
        {similarSeries.map((item, index) => {
          const creatorName = resolveSeriesCreatorName(item);
          const isLeadCard = index === 0;

          return (
            <Link
              key={item.id}
              href={`/series/${encodeURIComponent(item.id)}`}
              className={[
                cardClass,
                isLeadCard ? "md:col-span-2 xl:col-span-4" : "xl:col-span-2",
              ].join(" ")}
              aria-label={`View ${item.title}`}
            >
              <Cover
                tone={item.coverTone}
                coverUrl={item.coverUrl}
                label={item.title}
                eyebrow={creatorName || item.subtitle || "Series"}
                badge={getSeriesBadge(item)}
                className={
                  isLeadCard ? "aspect-[1.2/1] w-full" : "aspect-[3/4] w-full"
                }
              />
              <div className="space-y-2 border-t-[3px] border-white/15 p-4">
                <h3
                  className={`line-clamp-2 font-black uppercase tracking-[0.03em] text-white ${isLeadCard ? "text-base" : "text-sm"}`}
                >
                  {item.title}
                </h3>
                <p className="line-clamp-1 text-xs font-medium uppercase tracking-[0.12em] text-white/45">
                  {creatorName || item.subtitle || "Series"}
                </p>
                {Array.isArray(item.genres) && item.genres.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {item.genres.slice(0, 2).map((genre) => (
                      <span key={`${item.id}-${genre}`} className={chipClass}>
                        {genre}
                      </span>
                    ))}
                  </div>
                ) : null}
                {isLeadCard ? (
                  <p className="pt-1 text-xs font-black uppercase tracking-[0.22em] text-white/45">
                    Read now
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </SurfacePanel>
  );
}
