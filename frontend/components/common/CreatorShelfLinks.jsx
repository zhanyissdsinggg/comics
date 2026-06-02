"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { getCreatorDisplayName } from "../../lib/creators";
import { resolveSeriesCreatorIdentity } from "../../lib/creatorIdentity";
import { trackEvent } from "../../lib/trackEvent";
import {
  storefrontBadgeClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
} from "./StorefrontPagePrimitives";

function getSeriesId(item) {
  if (typeof item?.seriesId === "string" && item.seriesId.trim()) {
    return item.seriesId.trim();
  }

  if (typeof item?.id === "string" && item.id.trim()) {
    return item.id.trim().split("-")[0];
  }

  return "";
}

function getSeriesTitle(item) {
  if (typeof item?.title === "string" && item.title.trim()) {
    return item.title.trim();
  }

  return "";
}

function collectCreators(items, maxCreators) {
  const creatorMap = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const creatorIdentity = resolveSeriesCreatorIdentity(item);
    if (!creatorIdentity.hasPublicCredit || !creatorIdentity.slug) {
      return;
    }

    const current = creatorMap.get(creatorIdentity.slug) || {
      slug: creatorIdentity.slug,
      href: creatorIdentity.href,
      name: getCreatorDisplayName(creatorIdentity.displayName),
      spotlightTitle: getSeriesTitle(item),
      sourceSeriesId: getSeriesId(item),
    };

    if (!current.spotlightTitle) {
      current.spotlightTitle = getSeriesTitle(item);
    }
    if (!current.sourceSeriesId) {
      current.sourceSeriesId = getSeriesId(item);
    }

    creatorMap.set(creatorIdentity.slug, current);
  });

  return Array.from(creatorMap.values())
    .sort((left, right) => {
      if (Boolean(right.spotlightTitle) !== Boolean(left.spotlightTitle)) {
        return (
          Number(Boolean(right.spotlightTitle)) -
          Number(Boolean(left.spotlightTitle))
        );
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
  appearance = "default",
}) {
  const router = useRouter();
  const creators = useMemo(
    () => collectCreators(items, maxCreators),
    [items, maxCreators],
  );
  const isLight = appearance === "light";

  if (creators.length === 0) {
    return null;
  }

  const baseClassName = compact
    ? "rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,18,30,0.96)_0%,rgba(13,12,20,0.96)_100%)] px-3.5 py-3.5 shadow-[0_20px_46px_rgba(8,6,20,0.24)] backdrop-blur-xl"
    : "rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,18,30,0.96)_0%,rgba(13,12,20,0.96)_100%)] px-4 py-4 shadow-[0_24px_52px_rgba(8,6,20,0.26)] backdrop-blur-xl sm:px-5";

  const handleClick = (creator) => {
    const targetPath = creator.href || "/creators";

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
        <div
          className={
            compact ? "flex flex-wrap items-center gap-2" : "space-y-2"
          }
        >
          <p
            className={`${storefrontBadgeClass} ${isLight ? "border-slate-300 bg-slate-100 text-slate-600" : "text-white/60"}`}
          >
            {label}
          </p>
          {title ? (
            <h3 className="font-display text-lg font-semibold tracking-[-0.04em] text-white sm:text-xl">
              {title}
            </h3>
          ) : null}
          {description ? (
            <p
              className={`max-w-3xl text-sm leading-6 ${isLight ? "text-slate-600" : "text-white/66"}`}
            >
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {creators.map((creator) => (
            <Link
              key={creator.slug}
              href={creator.href || "/creators"}
              onClick={(event) => {
                event.preventDefault();
                handleClick(creator);
              }}
              className={`${storefrontSoftCardClass} group min-w-[12rem] max-w-full flex-1 px-4 py-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-white/16 hover:bg-[rgba(255,255,255,0.075)]`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">
                    {creator.name}
                  </span>
                  <span className="mt-1 block truncate text-[11px] uppercase tracking-[0.16em] text-white/45 transition group-hover:text-white/62">
                    {creator.spotlightTitle
                      ? `From ${creator.spotlightTitle}`
                      : "View creator shelf"}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`inline-flex h-9 w-9 items-center justify-center px-0 text-white/44 transition group-hover:translate-x-0.5 group-hover:text-white/80 ${storefrontSecondaryButtonClass}`}
                >
                  <ArrowRight className="size-4" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
