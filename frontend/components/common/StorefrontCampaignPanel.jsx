"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SurfacePanel from "./SurfacePanel";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { getStorefrontCampaign } from "../../lib/storefrontCampaigns";

export default function StorefrontCampaignPanel({
  series,
  sourcePath = "/",
  returnTo = sourcePath,
  className = "",
}) {
  const router = useRouter();
  const campaign = useMemo(() => getStorefrontCampaign(series), [series]);

  if (!series?.id || !campaign) {
    return null;
  }

  const handleOpenValuePath = () => {
    const attribution = {
      entryPoint: "SERIES_CAMPAIGN",
      campaignId: campaign.id,
      sourcePath,
      sourceSeriesId: series.id,
      returnTo,
    };

    if (campaign.valueKind === "store") {
      router.push(buildPathWithAttribution("/store", attribution, { focus: "auto" }));
      return;
    }

    router.push(buildPathWithAttribution("/subscribe", attribution));
  };

  return (
    <SurfacePanel className={`space-y-5 ${className}`.trim()}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
            Why this title works
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {campaign.title}
          </h2>
        </div>
        <span className="inline-flex w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
          {campaign.eyebrow}
        </span>
      </div>

      <p className="max-w-4xl text-sm leading-7 text-neutral-300">{campaign.description}</p>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            {campaign.reasonLabel}
          </p>
          <p className="mt-3 text-sm leading-6 text-neutral-300">{campaign.reason}</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            {campaign.nextMoveLabel}
          </p>
          <p className="mt-3 text-sm leading-6 text-neutral-300">{campaign.nextMove}</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            {campaign.valueLabel}
          </p>
          <p className="mt-3 text-sm leading-6 text-neutral-300">{campaign.value}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.push(campaign.discoveryHref)}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
        >
          {campaign.discoveryCta}
        </button>
        <button
          type="button"
          onClick={handleOpenValuePath}
          className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
        >
          {campaign.valueCta}
        </button>
      </div>
    </SurfacePanel>
  );
}
