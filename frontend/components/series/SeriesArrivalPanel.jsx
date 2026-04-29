"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SurfacePanel from "../common/SurfacePanel";
import { trackEvent } from "../../lib/trackEvent";
import { buildDiscoveryContext } from "../../lib/discoveryContext";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

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
      appearance="dark"
      accent="cyan"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/70">
            Found in
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.04em] text-white sm:text-3xl">
            {context.title}
          </h2>
        </div>
        <div className="rounded-[24px] border-2 border-white/20 bg-black px-4 py-4 text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
            Back to
          </p>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.03em] text-white">
            {context.returnTitle}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border-2 border-white/20 bg-black px-4 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
            Source
          </p>
          <p className="mt-3 text-2xl font-black uppercase tracking-[0.03em] text-white">
            {context.sourceLabel}
          </p>
        </div>
        <div className="rounded-[22px] border-2 border-white/20 bg-black px-4 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
            Row
          </p>
          <p className="mt-3 text-2xl font-black uppercase tracking-[0.03em] text-white">
            {context.laneValue}
          </p>
        </div>
        <div className="rounded-[22px] border-2 border-white/20 bg-black px-4 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
            Back to
          </p>
          <p className="mt-3 text-2xl font-black uppercase tracking-[0.03em] text-white">
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
          className={storefrontPrimaryButtonClass}
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
            className={storefrontSecondaryButtonClass}
          >
            Creator
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/rankings?view=featured")}
          className={storefrontSecondaryButtonClass}
        >
          Trending
        </button>
      </div>
    </SurfacePanel>
  );
}
