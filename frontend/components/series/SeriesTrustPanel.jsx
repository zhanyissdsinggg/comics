"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import ShareButton from "../common/ShareButton";
import SurfacePanel from "../common/SurfacePanel";
import { resolveCreatorIdentity } from "../../lib/creatorIdentity";

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
  return match ? `Ep ${match[1]}` : `Ep ${rawValue}`;
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
  const primaryButtonClass =
    "rounded-full border border-black bg-black px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition hover:bg-black/90";
  const secondaryButtonClass =
    "rounded-full border border-black/12 bg-white px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-black transition hover:border-black/18 hover:bg-black/[0.03]";

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

  const trustCards = [
    {
      label: "Creator",
      value: creatorIdentity.displayName,
      hint: creatorHref
        ? "Creator."
        : creatorIdentity.detail,
      onClick: creatorHref ? () => router.push(creatorHref) : null,
    },
    {
      label: "Reader pull",
      value:
        followers > 0
          ? formatCompactCount(followers)
          : formatCompactCount(Math.max(views, ratingCount)),
      hint:
        followers > 0
          ? "Following now."
          : views > 0
            ? "Reader buzz."
            : ratingCount > 0
              ? "Early ratings."
              : "Finding readers.",
    },
    {
      label: "Latest chapter",
      value: latestEpisode
        ? formatEpisodeLabel(latestEpisode)
        : status === "completed"
          ? "Completed"
          : "Live",
      hint: latestEpisode
        ? `Updated ${formatDateLabel(series?.updatedAt)}.`
        : status === "completed"
          ? "Completed."
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
    <SurfacePanel className="space-y-5" appearance="light" accent="blue">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-black/45">
            At a glance
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.06em] text-black sm:text-3xl">
            Worth a click.
          </h2>
        </div>
        <div className="rounded-[26px] border border-black/10 bg-[#f8f9fb] px-4 py-4 text-left shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
            Quick take
          </p>
          <p className="mt-3 text-sm leading-6 text-black/75">
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
              className="rounded-[24px] border border-black/10 bg-white px-4 py-4 text-left shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition hover:border-black/15 hover:bg-black/[0.02]"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                {card.label}
              </p>
              <p className="mt-3 text-2xl font-black uppercase tracking-[0.04em] text-black">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-black/65">
                {card.hint}
              </p>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-black/45">
                Creator
              </p>
            </button>
          ) : (
            <div
              key={card.label}
              className="rounded-[24px] border border-black/10 bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                {card.label}
              </p>
              <p className="mt-3 text-2xl font-black uppercase tracking-[0.04em] text-black">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-black/65">
                {card.hint}
              </p>
            </div>
          ),
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="rounded-[26px] border border-black/10 bg-[#f6f7fb] px-4 py-4">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
            Fit
          </p>
          <p className="mt-3 text-sm leading-7 text-black/70">
            {series?.title || "This title"} works best for readers who want{" "}
            {status === "completed"
              ? "a finished run"
              : "something to follow"}
            {leadGenre ? `, especially inside ${leadGenre}` : ""}
            {secondaryGenre ? ` and ${secondaryGenre}` : ""}.
          </p>
        </div>
        <div className="rounded-[26px] border border-black/10 bg-[#f8f9fb] px-4 py-4">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
            Share
          </p>
          <p className="mt-3 text-sm leading-7 text-black/70">
            Easy to pass along.
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
          Popular
        </button>
        {onFollowToggle ? (
          <button
            type="button"
            onClick={
              isFollowing ? () => router.push("/library") : onFollowToggle
            }
            className={secondaryButtonClass}
          >
            {isFollowing ? "Library" : "Save"}
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
