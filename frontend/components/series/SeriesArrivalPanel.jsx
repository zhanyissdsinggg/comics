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
    <SurfacePanel className={`mt-8 space-y-5 ${className}`.trim()}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
            Why you're seeing this
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {context.title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-neutral-300">{context.description}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Back where you came from
          </p>
          <p className="mt-3 text-sm leading-6 text-neutral-300">{context.returnHint}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Source
          </p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
            {context.sourceLabel}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Where this visit started before you landed on the series page.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Landing reason
          </p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
            {context.laneValue}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Why this title stood out enough to earn the next click.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Best next step
          </p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
            {context.returnTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-400">{context.returnHint}</p>
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
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
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
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            More by this creator
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/rankings?type=popular&window=week")}
          className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
        >
          See weekly chart
        </button>
      </div>
    </SurfacePanel>
  );
}
