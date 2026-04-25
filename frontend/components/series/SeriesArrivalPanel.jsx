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
            From
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.04em] text-black sm:text-3xl">
            {context.title}
          </h2>
        </div>
        <div className="rounded-[24px] border border-black/10 bg-[#f8f9fb] px-4 py-4 text-left shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
            Back
          </p>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.03em] text-black">
            {context.returnTitle}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-black/10 bg-white px-4 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
            From
          </p>
          <p className="mt-3 text-2xl font-black uppercase tracking-[0.03em] text-black">
            {context.sourceLabel}
          </p>
        </div>
        <div className="rounded-[22px] border border-black/10 bg-[#f6f7fb] px-4 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
            Lane
          </p>
          <p className="mt-3 text-2xl font-black uppercase tracking-[0.03em] text-black">
            {context.laneValue}
          </p>
        </div>
        <div className="rounded-[22px] border border-black/10 bg-[#f8f9fb] px-4 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
            Next
          </p>
          <p className="mt-3 text-2xl font-black uppercase tracking-[0.03em] text-black">
            {context.returnTitle}
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
          className="rounded-full border border-black bg-black px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition hover:bg-black/90"
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
            className="rounded-full border border-black/12 bg-white px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-black transition hover:border-black/18 hover:bg-black/[0.03]"
          >
            Creator
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/rankings?view=featured")}
            className="rounded-full border border-black/12 bg-white px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-black transition hover:border-black/18 hover:bg-black/[0.03]"
        >
          Popular
        </button>
      </div>
    </SurfacePanel>
  );
}
