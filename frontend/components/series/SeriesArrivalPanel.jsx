"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SurfacePanel from "../common/SurfacePanel";
import { trackEvent } from "../../lib/trackEvent";
import { buildDiscoveryContext } from "../../lib/discoveryContext";

export default function SeriesArrivalPanel({
  series,
  attribution = null,
  creatorHref = "",
  className = "",
}) {
  const router = useRouter();
  const context = useMemo(
    () => buildDiscoveryContext(series, attribution),
    [attribution, series],
  );

  if (!context) {
    return null;
  }

  return (
    <SurfacePanel
      className={`mt-8 space-y-5 ${className}`.trim()}
      appearance="light"
      accent="blue"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-black/45">
            From your last stop
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.04em] text-black sm:text-3xl">
            {context.title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-black/68">
            {context.description}
          </p>
        </div>
        <div className="rounded-[24px] border-[3px] border-black bg-[#fff7cf] px-4 py-4 text-left shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
            Back to source
          </p>
          <p className="mt-3 text-sm leading-6 text-black/68">
            {context.returnHint}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border-[3px] border-black bg-white px-4 py-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
            From
          </p>
          <p className="mt-3 text-2xl font-black uppercase tracking-[0.03em] text-black">
            {context.sourceLabel}
          </p>
          <p className="mt-2 text-sm leading-6 text-black/55">
            Where this visit began before you landed here.
          </p>
        </div>
        <div className="rounded-[22px] border-[3px] border-black bg-[#eefcff] px-4 py-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
            Why it stood out
          </p>
          <p className="mt-3 text-2xl font-black uppercase tracking-[0.03em] text-black">
            {context.laneValue}
          </p>
          <p className="mt-2 text-sm leading-6 text-black/55">
            The signal that made this title stand out.
          </p>
        </div>
        <div className="rounded-[22px] border-[3px] border-black bg-[#fff1f7] px-4 py-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
            Keep browsing
          </p>
          <p className="mt-3 text-2xl font-black uppercase tracking-[0.03em] text-black">
            {context.returnTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-black/55">
            {context.returnHint}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            trackEvent("series_arrival_return", {
              seriesId: series?.id,
              entryPoint: attribution?.entryPoint,
              campaignId: attribution?.campaignId,
              sourcePath: context.sourcePath,
            });
            router.push(context.sourcePath);
          }}
          className="rounded-full border-[3px] border-black bg-[#ff007a] px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#e1006d] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
        >
          {context.returnLabel}
        </button>
        {creatorHref ? (
          <button
            type="button"
            onClick={() => {
              trackEvent("series_arrival_creator", {
                seriesId: series?.id,
                entryPoint: attribution?.entryPoint,
                campaignId: attribution?.campaignId,
              });
              router.push(creatorHref);
            }}
            className="rounded-full border-[3px] border-black bg-white px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black transition hover:-translate-y-0.5 hover:bg-[#eefcff]"
          >
            More by this creator
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/rankings?view=featured")}
          className="rounded-full border-[3px] border-black bg-white px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black transition hover:-translate-y-0.5 hover:bg-[#eefcff]"
        >
          Browse Series
        </button>
      </div>
    </SurfacePanel>
  );
}
