"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import {
  buildCreatorHref,
  getCreatorDisplayName,
  normalizeCreatorName,
  slugifyCreatorName,
} from "../../lib/creators";
import { trackEvent } from "../../lib/trackEvent";

function getSeriesId(item) {
  if (typeof item?.seriesId === "string" && item.seriesId.trim()) {
    return item.seriesId.trim();
  }

  if (typeof item?.id === "string" && item.id.trim()) {
    return item.id.trim().split("-")[0];
  }

  return "";
}

function collectCreators(items, maxCreators) {
  const creatorMap = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const normalizedName = normalizeCreatorName(item?.author);
    if (!normalizedName) {
      return;
    }

    const slug = slugifyCreatorName(normalizedName);
    const current = creatorMap.get(slug) || {
      slug,
      name: getCreatorDisplayName(normalizedName),
      titles: 0,
      sourceSeriesId: getSeriesId(item),
    };

    current.titles += 1;
    if (!current.sourceSeriesId) {
      current.sourceSeriesId = getSeriesId(item);
    }

    creatorMap.set(slug, current);
  });

  return Array.from(creatorMap.values())
    .sort((left, right) => {
      if (right.titles !== left.titles) {
        return right.titles - left.titles;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, Math.max(1, Number(maxCreators) || 6));
}

export default function CreatorShelfLinks({
  items,
  entryPoint = "CREATOR_CHIP",
  campaignId = "creator_shelf",
  sourcePath = "/",
  title = "",
  description = "",
  label = "More from these creators",
  maxCreators = 6,
  compact = false,
  className = "",
}) {
  const router = useRouter();
  const creators = useMemo(() => collectCreators(items, maxCreators), [items, maxCreators]);

  if (creators.length === 0) {
    return null;
  }

  const baseClassName = compact
    ? "rounded-[24px] border border-white/10 bg-white/[0.025] px-3 py-3"
    : "rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5";

  const handleClick = (creator) => {
    const targetPath = buildCreatorHref(creator.name);

    trackEvent("creator_chip_click", {
      entryPoint,
      campaignId,
      creatorName: creator.name,
      sourcePath,
      sourceSeriesId: creator.sourceSeriesId || undefined,
    });

    router.push(
      buildPathWithAttribution(targetPath, {
        entryPoint,
        campaignId,
        sourcePath,
        sourceSeriesId: creator.sourceSeriesId || undefined,
        returnTo: targetPath,
      }),
    );
  };

  return (
    <div className={`${baseClassName} ${className}`.trim()}>
      <div className={compact ? "flex flex-col gap-3" : "space-y-3"}>
        <div className={compact ? "flex flex-wrap items-center gap-2" : "space-y-2"}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
            {label}
          </p>
          {title ? (
            <h3 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h3>
          ) : null}
          {description ? <p className="max-w-3xl text-sm leading-6 text-neutral-400">{description}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2.5">
          {creators.map((creator) => (
            <button
              key={creator.slug}
              type="button"
              onClick={() => handleClick(creator)}
              className="group rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{creator.name}</span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 transition group-hover:text-neutral-400">
                  {creator.titles} title{creator.titles === 1 ? "" : "s"}
                </span>
                <span
                  aria-hidden="true"
                  className="text-sm text-neutral-500 transition group-hover:translate-x-0.5 group-hover:text-neutral-300"
                >
                  &gt;
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
