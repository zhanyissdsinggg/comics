"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SurfacePanel from "../common/SurfacePanel";
import { getReadingCadenceLabel } from "../../lib/storefrontCopy";
import {
  formatInstallmentCount,
  getInstallmentLabel,
  getStartReadingLabel,
} from "../../lib/seriesFormatLabels";
import {
  storefrontInfoCardClass,
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

function getPrimaryAction({
  series,
  continueHref,
  startHref,
  freeEpisodeCount,
}) {
  if (continueHref) {
    return {
      label: "Keep Reading",
      href: continueHref,
      hint: "Pick up where you left off.",
    };
  }

  if (startHref && freeEpisodeCount > 0) {
    return {
      label: getStartReadingLabel(series, 1),
      href: startHref,
      hint: `${formatInstallmentCount(series, freeEpisodeCount)} free to start.`,
    };
  }

  if (startHref) {
    return {
      label: getStartReadingLabel(series, 1),
      href: startHref,
      hint: `Start at ${getInstallmentLabel(series)} 1.`,
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
      label: "Easy start",
      body: `${formatInstallmentCount(series, freeEpisodeCount)} free to start.`,
    };
  }

  if (status === "completed") {
    return {
      label: "Binge-ready",
      body: "Finished and ready to binge.",
    };
  }

  return {
    label: "Good pick",
    body: leadGenre ? `${leadGenre} pick.` : "Worth saving.",
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
  const primaryButtonClass = storefrontPrimaryButtonClass;
  const secondaryButtonClass = storefrontSecondaryButtonClass;

  const fitModel = useMemo(() => {
    const leadGenre =
      Array.isArray(series?.genres) && series.genres.length > 0
        ? series.genres[0]
        : "";
    const secondaryGenre =
      Array.isArray(series?.genres) && series.genres.length > 1
        ? series.genres[1]
        : "";
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
      primaryAction: getPrimaryAction({
        series,
        continueHref,
        startHref,
        freeEpisodeCount,
      }),
      bestFor:
        status === "completed"
          ? `${leadGenre ? `${leadGenre} fans` : "Readers"} who want the full run.`
          : `${leadGenre ? `${leadGenre} fans` : "Readers"} who want something still updating.`,
      commitment: `${getCommitmentLabel(status, episodeCount)} - ${episodeCount > 0 ? formatInstallmentCount(series, episodeCount) : "updating"}`,
      socialProof:
        readerProof > 0
          ? `${formatCompactCount(readerProof)} readers. Updated ${formatDateLabel(series?.updatedAt)}.`
          : `Updated ${formatDateLabel(series?.updatedAt)}.`,
      genrePath: leadGenre
        ? `/search?genre=${encodeURIComponent(leadGenre)}&sort=popular`
        : "/search?sort=popular",
    };
  }, [continueHref, episodes, series, startHref]);

  if (!series?.id) {
    return null;
  }

  const fitCards = [
    {
      label: "Vibe",
      value: fitModel.cadence,
      body: fitModel.bestFor,
    },
    {
      label: "Commitment",
      value: fitModel.commitment,
      body: fitModel.starterLane.body,
    },
    {
      label: "Readers",
      value:
        fitModel.readerProof > 0
          ? formatCompactCount(fitModel.readerProof)
          : "New",
      body: fitModel.socialProof,
    },
  ];

  return (
    <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
            Quick take
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Why read this?
          </h2>
        </div>
        <div className={`${storefrontInfoCardClass} px-4 py-4 text-left`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/58">
            Jump in
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/80">
            {fitModel.starterLane.body}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {fitCards.map((card) => (
          <div
            key={card.label}
            className={`${storefrontInfoCardClass} px-4 py-4 text-white`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/58">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
              {card.value}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/80">
              {card.body}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
        <div className={`${storefrontInfoCardClass} px-4 py-4 text-white`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/58">
            Good fit
          </p>
          <p className="mt-3 text-sm font-semibold leading-7 text-white/80">
            {series?.title || "This title"} is a fit if you want{" "}
            {fitModel.status === "completed"
              ? "a longer read with no waiting"
              : "something you can save and come back to"}
            {fitModel.leadGenre
              ? `, especially if you're already into ${fitModel.leadGenre.toLowerCase()}`
              : ""}
            .
          </p>
        </div>
        <div className={`${storefrontInfoCardClass} px-4 py-4 text-white`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/58">
            Also try
          </p>
          <p className="mt-3 text-sm font-semibold leading-7 text-white/80">
            {fitModel.secondaryGenre
              ? `If you like ${fitModel.leadGenre}, try ${fitModel.secondaryGenre} next.`
              : "Want more? Check the genre or creator page."}
          </p>
        </div>
      </div>

      {fitModel.primaryAction ? (
        <div className={`${storefrontInfoCardClass} px-4 py-4 text-white`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/58">
            Up next
          </p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-3xl text-sm font-semibold leading-7 text-white/80">
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
            fitModel.primaryAction ? secondaryButtonClass : primaryButtonClass
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
            Creator
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/rankings?type=popular&window=week")}
          className={secondaryButtonClass}
        >
          Trending
        </button>
      </div>
    </SurfacePanel>
  );
}
