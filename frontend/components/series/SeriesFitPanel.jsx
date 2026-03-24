"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SurfacePanel from "../common/SurfacePanel";
import { getReadingCadenceLabel } from "../../lib/storefrontCopy";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCompactCount(value) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Math.max(0, toNumber(value)));
}

function formatDateLabel(value) {
  if (!value) {
    return "recently";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

function getEpisodeCount(series, episodes) {
  if (Array.isArray(episodes) && episodes.length > 0) {
    return episodes.length;
  }

  const directCount = toNumber(series?.episodeCount);
  return directCount > 0 ? directCount : 0;
}

function getPrimaryAction({ continueHref, startHref, freeEpisodeCount }) {
  if (continueHref) {
    return {
      label: "Continue reading",
      href: continueHref,
      hint: "Jump straight back in from where you left off.",
    };
  }

  if (startHref && freeEpisodeCount > 0) {
    return {
      label: "Try the opener",
      href: startHref,
      hint: `${freeEpisodeCount} free episode${freeEpisodeCount === 1 ? "" : "s"} let you try the series before unlocking more.`,
    };
  }

  if (startHref) {
    return {
      label: "Read episode 1",
      href: startHref,
      hint: "Start at Episode 1 and see if the story clicks.",
    };
  }

  return null;
}

function getCommitmentLabel(status, episodeCount) {
  if (String(status).toLowerCase() === "completed") {
    return episodeCount >= 40 ? "Weekend binge" : "Fast binge";
  }

  if (episodeCount >= 40) {
    return "Deep backlog";
  }

  if (episodeCount >= 15) {
    return "Steady catch-up";
  }

  return "Fresh start";
}

function getStarterLane(series, leadGenre) {
  const freeEpisodeCount = toNumber(series?.freeEpisodeCount);
  const status = String(series?.status || "").toLowerCase();

  if (freeEpisodeCount > 0) {
    return {
      label: "Easy first try",
      body: `${freeEpisodeCount} free episode${freeEpisodeCount === 1 ? "" : "s"} make this easy to sample before you commit.`,
    };
  }

  if (status === "completed") {
    return {
      label: "Built for a binge",
      body: "A completed run is best if you want the full story without waiting for another update.",
    };
  }

  return {
    label: "Good to come back to",
    body: leadGenre
      ? `This title works well for readers who like coming back for more ${leadGenre.toLowerCase()} over time.`
      : "This title works well for readers who like coming back over time instead of finishing everything in one sitting.",
  };
}

export default function SeriesFitPanel({
  series,
  episodes = [],
  creatorHref = "",
  continueHref = "",
  startHref = "",
}) {
  const router = useRouter();
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";

  const fitModel = useMemo(() => {
    const leadGenre = Array.isArray(series?.genres) && series.genres.length > 0 ? series.genres[0] : "";
    const secondaryGenre = Array.isArray(series?.genres) && series.genres.length > 1 ? series.genres[1] : "";
    const episodeCount = getEpisodeCount(series, episodes);
    const freeEpisodeCount = toNumber(series?.freeEpisodeCount);
    const status = String(series?.status || "").toLowerCase();
    const cadence = getReadingCadenceLabel(status);
    const readerProof = Math.max(
      toNumber(series?.followers),
      toNumber(series?.views),
      toNumber(series?.ratingCount),
    );
    const starterLane = getStarterLane(series, leadGenre);

    return {
      leadGenre,
      secondaryGenre,
      episodeCount,
      freeEpisodeCount,
      status,
      cadence,
      readerProof,
      starterLane,
      primaryAction: getPrimaryAction({ continueHref, startHref, freeEpisodeCount }),
      bestFor:
        status === "completed"
          ? `Readers who want ${leadGenre ? `${leadGenre.toLowerCase()}-driven` : "story-driven"} payoff without release gaps.`
          : `Readers who want ${leadGenre ? `an ongoing ${leadGenre.toLowerCase()} title` : "an ongoing title"} they can save and come back to.`,
      commitment: `${getCommitmentLabel(status, episodeCount)} - ${episodeCount > 0 ? `${episodeCount} episode${episodeCount === 1 ? "" : "s"}` : "ongoing run"}`,
      socialProof:
        readerProof > 0
          ? `${formatCompactCount(readerProof)} visible reader signals and an update trail from ${formatDateLabel(series?.updatedAt)}.`
          : `Fresh pick with updates as recent as ${formatDateLabel(series?.updatedAt)}.`,
      genrePath: leadGenre ? `/search?genre=${encodeURIComponent(leadGenre)}&sort=popular` : "/search?sort=popular",
    };
  }, [continueHref, episodes, series, startHref]);

  if (!series?.id) {
    return null;
  }

  const fitCards = [
    {
      label: "Best for",
      value: fitModel.cadence,
      body: fitModel.bestFor,
    },
    {
      label: "Commitment",
      value: fitModel.commitment,
      body: fitModel.starterLane.body,
    },
    {
      label: "Reader signals",
      value: fitModel.readerProof > 0 ? formatCompactCount(fitModel.readerProof) : "New",
      body: fitModel.socialProof,
    },
  ];

  return (
    <SurfacePanel className="space-y-5" appearance="light" accent="blue">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Before you start
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Is this your kind of read?
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            The best title pages make it easy to feel the vibe, the commitment, and the easiest way in.
          </p>
        </div>
        <div className="rounded-[24px] border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-4 py-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Best way in
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            <span className="font-semibold text-slate-950">{fitModel.starterLane.label}.</span> {fitModel.starterLane.body}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {fitCards.map((card) => (
          <div
            key={card.label}
            className="rounded-[22px] border border-black/8 bg-[#f8f9fc] px-4 py-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {card.label}
            </p>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
              {card.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[24px] border border-black/8 bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Best if you want
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {series?.title || "This title"} works best when the reader wants{" "}
            {fitModel.status === "completed" ? "continuity and payoff in a longer session" : "a title worth saving and revisiting over time"}
            {fitModel.leadGenre ? `, especially if ${fitModel.leadGenre.toLowerCase()} is already part of the browsing intent` : ""}.
          </p>
        </div>
        <div className="rounded-[24px] border border-black/8 bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            What to compare next
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {fitModel.secondaryGenre
              ? `If you like ${fitModel.leadGenre}, ${fitModel.secondaryGenre} is the easiest adjacent genre to compare next.`
              : "If you want more to compare, open the genre page or the creator page before committing."}
          </p>
        </div>
      </div>

      {fitModel.primaryAction ? (
        <div className="rounded-[24px] border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Recommended next step
          </p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-3xl text-sm leading-7 text-slate-700">
              {fitModel.primaryAction.hint}
            </p>
            <button
              type="button"
              onClick={() => router.push(fitModel.primaryAction.href)}
              className={primaryButtonClass}
            >
              {fitModel.primaryAction.label}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.push(fitModel.genrePath)}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
            fitModel.primaryAction
              ? secondaryButtonClass
              : primaryButtonClass
          }`}
        >
          {fitModel.leadGenre ? `More ${fitModel.leadGenre}` : "More like this"}
        </button>
        {creatorHref ? (
          <button
            type="button"
            onClick={() => router.push(creatorHref)}
            className={secondaryButtonClass}
          >
            More by this creator
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/rankings?type=popular&window=week")}
          className={secondaryButtonClass}
        >
          See what's hot
        </button>
      </div>
    </SurfacePanel>
  );
}
