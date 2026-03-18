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
  const context = useMemo(() => buildDiscoveryContext(series, attribution), [attribution, series]);

  if (!context) {
    return null;
  }

  return (
    <SurfacePanel className={`mt-8 space-y-5 ${className}`.trim()} appearance="light" accent="blue">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            A better next click
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {context.title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{context.description}</p>
        </div>
        <div className="rounded-[24px] border border-black/6 bg-white/84 px-4 py-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            If you want to go back
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{context.returnHint}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-black/6 bg-white/84 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Source
          </p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
            {context.sourceLabel}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Where this visit started before you landed here.
          </p>
        </div>
        <div className="rounded-[22px] border border-black/6 bg-white/84 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Why it stood out
          </p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
            {context.laneValue}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            The signal that made this title worth the next click.
          </p>
        </div>
        <div className="rounded-[22px] border border-black/6 bg-white/84 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Best next move
          </p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
            {context.returnTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{context.returnHint}</p>
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
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
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
            className="rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
          >
            More by this creator
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/rankings?type=popular&window=week")}
          className="rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
        >
          Open Top Series
        </button>
      </div>
    </SurfacePanel>
  );
}
