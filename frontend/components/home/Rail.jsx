"use client";

import { useRouter } from "next/navigation";
import CreatorShelfLinks from "../common/CreatorShelfLinks";
import PortraitCard from "./PortraitCard";
import { ensureArray } from "../../lib/validators";

export default function Rail({
  eyebrow,
  title,
  items,
  tone,
  railName,
  onItemClick,
  reason,
  href = "",
  ctaLabel = "See All",
  showCreatorShelfLinks = false,
  creatorEntryPoint = "CREATOR_CHIP",
  creatorCampaignId = "",
  creatorSourcePath = "/",
  creatorLabel = "More from these creators",
}) {
  const router = useRouter();
  const safeItems = ensureArray(items);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-emerald-500" />
          <div className="flex flex-col gap-1">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="text-lg font-bold tracking-tight text-white md:text-xl">{title}</h2>
            {reason ? (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {reason}
              </span>
            ) : null}
          </div>
        </div>

        {href ? (
          <button
            type="button"
            onClick={() => router.push(href)}
            className="flex items-center gap-1 text-xs font-medium text-neutral-400 transition-colors hover:text-emerald-400"
          >
            {ctaLabel}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ) : null}
      </div>

      {showCreatorShelfLinks && safeItems.length > 0 ? (
        <CreatorShelfLinks
          items={safeItems}
          entryPoint={creatorEntryPoint}
          campaignId={creatorCampaignId || railName || title}
          sourcePath={creatorSourcePath}
          label={creatorLabel}
          compact
        />
      ) : null}

      {safeItems.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-8 text-center">
          <p className="text-sm text-neutral-500">Nothing is ready here yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {safeItems.map((item) => (
            <PortraitCard
              key={item.id}
              item={item}
              tone={tone}
              onClick={() => onItemClick?.(item, railName || title)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
