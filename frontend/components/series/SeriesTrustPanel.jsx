"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import ShareButton from "../common/ShareButton";
import SurfacePanel from "../common/SurfacePanel";
import { resolveCreatorIdentity } from "../../lib/creatorIdentity";
import {
  formatInstallmentLabel,
  getInstallmentLabel,
} from "../../lib/seriesFormatLabels";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCompactCount(value) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(toNumber(value));
}

function formatDateLabel(value) {
  if (!value) {
    return "Recently updated";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

function formatEpisodeLabel(episode) {
  if (!episode?.number && !episode?.id) {
    return "Latest release";
  }

  const rawValue = episode.number || episode.id;
  const match = String(rawValue).match(/(\d+)/);
  return match
    ? formatInstallmentLabel(episode, match[1])
    : formatInstallmentLabel(episode, rawValue);
}

function getLatestEpisode(episodes) {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    return null;
  }

  return (
    [...episodes].sort((left, right) => {
      const leftNumber = Number(left?.number || 0);
      const rightNumber = Number(right?.number || 0);
      return rightNumber - leftNumber;
    })[0] || null
  );
}

export default function SeriesTrustPanel({
  series,
  episodes = [],
  isFollowing = false,
  onFollowToggle = null,
  sharePath = "",
  creatorHref = "",
}) {
  const router = useRouter();
  const primaryButtonClass = storefrontPrimaryButtonClass;
  const secondaryButtonClass = storefrontSecondaryButtonClass;

  const latestEpisode = useMemo(() => getLatestEpisode(episodes), [episodes]);
  const shareUrl = useMemo(() => {
    if (sharePath) {
      if (typeof window !== "undefined") {
        return new URL(sharePath, window.location.origin).toString();
      }
      return sharePath;
    }

    if (typeof window !== "undefined") {
      return window.location.href;
    }

    return "";
  }, [sharePath]);

  const leadGenre =
    Array.isArray(series?.genres) && series.genres.length > 0
      ? series.genres[0]
      : "";
  const secondaryGenre =
    Array.isArray(series?.genres) && series.genres.length > 1
      ? series.genres[1]
      : "";
  const creatorIdentity = resolveCreatorIdentity(series?.author);
  const followers = toNumber(series?.followers);
  const views = toNumber(series?.views);
  const ratingCount = toNumber(series?.ratingCount);
  const status = String(series?.status || "").toLowerCase();
  const latestInstallmentLabel = getInstallmentLabel(series).toLowerCase();

  const trustCards = [
    {
      label: "Creator",
      value: creatorIdentity.displayName,
      hint: creatorHref
        ? "See more from this creator."
        : creatorIdentity.detail,
      onClick: creatorHref ? () => router.push(creatorHref) : null,
    },
    {
      label: "Readers",
      value:
        followers > 0
          ? formatCompactCount(followers)
          : formatCompactCount(Math.max(views, ratingCount)),
      hint:
        followers > 0
          ? "Readers are here."
          : views > 0
            ? "Readers are here."
            : ratingCount > 0
              ? "People are finding it."
              : "Still early.",
    },
    {
      label: `Latest ${latestInstallmentLabel}`,
      value: latestEpisode
        ? formatEpisodeLabel(latestEpisode)
        : status === "completed"
          ? "Finished"
          : "Live",
      hint: latestEpisode
        ? `Updated ${formatDateLabel(series?.updatedAt)}.`
        : status === "completed"
          ? "Finished."
          : `Updated ${formatDateLabel(series?.updatedAt)}.`,
    },
  ];

  const trustNarrative = useMemo(() => {
    if (status === "completed") {
      return "Complete and ready.";
    }

    if (latestEpisode) {
      return `${formatEpisodeLabel(latestEpisode)} is live.`;
    }

    return "Easy to jump in.";
  }, [latestEpisode, status]);

  const genreLaneHref = leadGenre
    ? `/search?genre=${encodeURIComponent(leadGenre)}&sort=popular`
    : "/search?sort=popular";

  return (
    <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/58">
            At a glance
          </p>
          <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.35rem]">
            What to know
          </h2>
        </div>
        <div className="rounded-[26px] border border-white/10 bg-white/[0.03] px-4 py-4 text-left shadow-[0_18px_40px_rgba(8,6,20,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
            Right now
          </p>
          <p className="mt-3 text-sm leading-6 text-white/72">
            {trustNarrative}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {trustCards.map((card) =>
          card.onClick ? (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 text-left text-white shadow-[0_18px_40px_rgba(8,6,20,0.22)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.05]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
                {card.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                {card.hint}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/48">
                Creator
              </p>
            </button>
          ) : (
            <div
              key={card.label}
              className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 text-white shadow-[0_18px_40px_rgba(8,6,20,0.22)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
                {card.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                {card.hint}
              </p>
            </div>
          ),
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="rounded-[26px] border border-white/10 bg-white/[0.03] px-4 py-4 text-white shadow-[0_18px_40px_rgba(8,6,20,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
            Why read it
          </p>
          <p className="mt-3 text-sm leading-7 text-white/72">
            {series?.title || "This title"} fits if you want{" "}
            {status === "completed" ? "a finished run" : "something to follow"}
            {leadGenre ? `, especially inside ${leadGenre}` : ""}
            {secondaryGenre ? ` and ${secondaryGenre}` : ""}.
          </p>
        </div>
        <div className="rounded-[26px] border border-white/10 bg-white/[0.03] px-4 py-4 text-white shadow-[0_18px_40px_rgba(8,6,20,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
            Share
          </p>
          <p className="mt-3 text-sm leading-7 text-white/72">
            Send it to a friend.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.push(genreLaneHref)}
          className={primaryButtonClass}
        >
          {leadGenre ? `More ${leadGenre}` : "More like this"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/rankings?view=featured")}
          className={secondaryButtonClass}
        >
          Trending
        </button>
        {onFollowToggle ? (
          <button
            type="button"
            onClick={
              isFollowing ? () => router.push("/library") : onFollowToggle
            }
            className={secondaryButtonClass}
          >
            {isFollowing ? "Open Library" : "Save Series"}
          </button>
        ) : null}
        <ShareButton
          url={shareUrl}
          title={series?.title || "Check out this series"}
          description={series?.description || ""}
          className={secondaryButtonClass}
        />
      </div>
    </SurfacePanel>
  );
}
