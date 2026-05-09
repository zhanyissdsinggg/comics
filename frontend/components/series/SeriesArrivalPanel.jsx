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
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/58">
            Found in
          </p>
          <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.35rem]">
            {context.title}
          </h2>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 text-left shadow-[0_18px_40px_rgba(8,6,20,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
            Back to
          </p>
          <p className="mt-3 text-sm font-semibold tracking-[-0.01em] text-white">
            {context.returnTitle}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 shadow-[0_18px_40px_rgba(8,6,20,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
            Source
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
            {context.sourceLabel}
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 shadow-[0_18px_40px_rgba(8,6,20,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
            Row
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
            {context.laneValue}
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 shadow-[0_18px_40px_rgba(8,6,20,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
            Back to
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
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
