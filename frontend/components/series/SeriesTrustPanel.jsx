"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import ShareButton from "../common/ShareButton";
import SurfacePanel from "../common/SurfacePanel";

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

  return [...episodes].sort((left, right) => {
    const leftNumber = Number(left?.number || 0);
    const rightNumber = Number(right?.number || 0);
    return rightNumber - leftNumber;
  })[0] || null;
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

  const leadGenre = Array.isArray(series?.genres) && series.genres.length > 0 ? series.genres[0] : "";
  const secondaryGenre = Array.isArray(series?.genres) && series.genres.length > 1 ? series.genres[1] : "";
  const creatorLabel = series?.author || "Studio";
  const followers = toNumber(series?.followers);
  const views = toNumber(series?.views);
  const ratingCount = toNumber(series?.ratingCount);
  const status = String(series?.status || "").toLowerCase();

  const trustCards = [
    {
      label: "Creator",
      value: creatorLabel,
      hint: creatorHref
        ? "View the creator page and browse related series."
        : "The credited creator or studio attached to this title.",
      onClick: creatorHref ? () => router.push(creatorHref) : null,
    },
    {
      label: "Reader proof",
      value: followers > 0 ? formatCompactCount(followers) : formatCompactCount(Math.max(views, ratingCount)),
      hint:
        followers > 0
          ? "Readers who already saved this series."
          : views > 0
            ? "Reader interest already building around this series."
            : ratingCount > 0
              ? "Ratings from readers who already tried it."
              : "Early readers can shape the first impression.",
    },
    {
      label: "Release pulse",
      value: latestEpisode ? formatEpisodeLabel(latestEpisode) : status === "completed" ? "Completed" : "Live",
      hint: latestEpisode
        ? `Most recent visible release. Updated ${formatDateLabel(series?.updatedAt)}.`
        : status === "completed"
          ? "Finished run ready for uninterrupted reading."
          : `Updated ${formatDateLabel(series?.updatedAt)}.`,
    },
  ];

  const trustNarrative = useMemo(() => {
    if (status === "completed") {
      return "Completed series are easier to commit to because the full story is already there to read.";
    }

    if (latestEpisode) {
      return `${formatEpisodeLabel(latestEpisode)} is the latest visible chapter, so readers can see this series is still active.`;
    }

    return "Ongoing series feel more trustworthy when updates and reader activity are easy to spot.";
  }, [latestEpisode, status]);

  const genreLaneHref = leadGenre
    ? `/search?genre=${encodeURIComponent(leadGenre)}&sort=popular`
    : "/search?sort=popular";

  return (
    <SurfacePanel className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
            What to know
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Why readers stick with this series.
          </h2>
          <p className="mt-3 text-sm leading-7 text-neutral-300">
            Before you unlock more chapters, it helps to know who made the series, how active it is, and how many readers are already following along.
          </p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Quick take
          </p>
          <p className="mt-3 text-sm leading-6 text-neutral-300">{trustNarrative}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {trustCards.map((card) =>
          card.onClick ? (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:border-emerald-300/30 hover:bg-white/[0.06]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                {card.label}
              </p>
              <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{card.hint}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                More by this creator
              </p>
            </button>
          ) : (
            <div
              key={card.label}
              className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                {card.label}
              </p>
              <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{card.hint}</p>
            </div>
          ),
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Good if you want
          </p>
          <p className="mt-3 text-sm leading-7 text-neutral-300">
            {series?.title || "This title"} is positioned best for readers who want
            {" "}
            {status === "completed" ? "a finished run with immediate payoff" : "a title they can return to regularly"}
            {leadGenre ? `, especially inside ${leadGenre}` : ""}
            {secondaryGenre ? ` and ${secondaryGenre}` : ""}.
          </p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Easy to recommend
          </p>
          <p className="mt-3 text-sm leading-7 text-neutral-300">
            This page is easier to share when it already shows the creator, latest update, reader interest, and a clear way to start reading.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.push(genreLaneHref)}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
        >
          {leadGenre ? `Browse ${leadGenre}` : "Browse similar titles"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/rankings?type=popular&window=week")}
          className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
        >
          Open weekly chart
        </button>
        {onFollowToggle ? (
          <button
            type="button"
            onClick={isFollowing ? () => router.push("/library") : onFollowToggle}
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            {isFollowing ? "Open library" : "Save to library"}
          </button>
        ) : null}
        <ShareButton
          url={shareUrl}
          title={series?.title || "Check out this series"}
          description={series?.description || ""}
          className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
        />
      </div>
    </SurfacePanel>
  );
}
