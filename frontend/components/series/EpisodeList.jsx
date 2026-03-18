"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EpisodeRow from "./EpisodeRow";
import { useProgressStore } from "../../store/useProgressStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";

function sortEpisodes(episodes, sortOrder) {
  const sorted = [...episodes];
  sorted.sort((a, b) => {
    const aNum = a?.number ?? 0;
    const bNum = b?.number ?? 0;
    return sortOrder === "oldest" ? aNum - bNum : bNum - aNum;
  });
  return sorted;
}

export default function EpisodeList({
  series,
  episodes,
  entitlement,
  wallet,
  coupons,
  onRead,
  onUnlock,
  onClaim,
  onSubscribe,
}) {
  const router = useRouter();
  const { getProgress } = useProgressStore();
  const [sortOrder, setSortOrder] = useState("newest");
  const [filter, setFilter] = useState("all");
  const unlockedEpisodeIds = useMemo(
    () => entitlement?.unlockedEpisodeIds || [],
    [entitlement?.unlockedEpisodeIds]
  );
  const seriesProgress = series?.id ? getProgress(series.id) : null;
  const walletTotal = (wallet?.paidPts || 0) + (wallet?.bonusPts || 0);
  const isSubscriber = Boolean(wallet?.subscription?.active);
  const totalEpisodes = Array.isArray(episodes) ? episodes.length : 0;
  const lockedCount = Math.max(0, totalEpisodes - unlockedEpisodeIds.length);
  const freeUnlockCount = useMemo(
    () =>
      (Array.isArray(episodes) ? episodes : []).filter(
        (episode) => episode?.ttfEligible && series?.ttf?.enabled
      ).length,
    [episodes, series?.ttf?.enabled]
  );
  const freePreviewCount = useMemo(
    () =>
      (Array.isArray(episodes) ? episodes : []).filter(
        (episode) => Number(episode?.previewFreePages || 0) > 0
      ).length,
    [episodes]
  );
  const filteredEpisodes = useMemo(() => {
    const list = Array.isArray(episodes) ? episodes : [];
    if (filter === "unlocked") {
      return list.filter((episode) => unlockedEpisodeIds.includes(episode?.id));
    }
    if (filter === "locked") {
      return list.filter((episode) => !unlockedEpisodeIds.includes(episode?.id));
    }
    if (filter === "ttf") {
      return list.filter((episode) => episode?.ttfEligible && series?.ttf?.enabled);
    }
    return list;
  }, [episodes, filter, unlockedEpisodeIds, series?.ttf?.enabled]);
  const sortedEpisodes = useMemo(
    () => sortEpisodes(filteredEpisodes, sortOrder),
    [filteredEpisodes, sortOrder]
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const needsCountdown = useMemo(
    () =>
      sortedEpisodes.some(
        (episode) =>
          !unlockedEpisodeIds.includes(episode?.id) &&
          episode?.ttfEligible &&
          episode?.ttfReadyAt
      ),
    [sortedEpisodes, unlockedEpisodeIds]
  );

  useEffect(() => {
    if (!needsCountdown) {
      return undefined;
    }
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [needsCountdown]);
  const summaryItems = [
    `${unlockedEpisodeIds.length.toLocaleString()} ready`,
    lockedCount > 0
      ? `${lockedCount.toLocaleString()} locked`
      : "All unlocked",
    freeUnlockCount > 0
      ? `${freeUnlockCount.toLocaleString()} free reads`
      : freePreviewCount > 0
        ? `${freePreviewCount.toLocaleString()} previews`
        : "Locked chapters",
    walletTotal > 0 ? `${walletTotal.toLocaleString()} points` : "0 points",
    isSubscriber ? "Member access" : "Points access",
  ];
  const episodePrice = Number(series?.pricing?.episodePrice || 0);
  const accessGuides = [
    {
      label: "Start path",
      title:
        series?.hasFreeEpisodes || Number(series?.freeEpisodeCount || 0) > 0
          ? "Use the free start first."
          : "Start with the opening chapter.",
      description:
        Number(series?.freeEpisodeCount || 0) > 0
          ? `${Number(series.freeEpisodeCount).toLocaleString()} chapter${Number(series.freeEpisodeCount) === 1 ? "" : "s"} are free before points kick in.`
          : freeUnlockCount > 0
            ? `${freeUnlockCount.toLocaleString()} chapter${freeUnlockCount === 1 ? "" : "s"} can unlock on a timer.`
            : freePreviewCount > 0
              ? `${freePreviewCount.toLocaleString()} chapter${freePreviewCount === 1 ? "" : "s"} include preview pages before you unlock.`
              : "This title moves into paid unlocks quickly, so keep points or membership in view.",
    },
    {
      label: "Unlock path",
      title: episodePrice > 0 ? `${episodePrice.toLocaleString()} points per locked chapter.` : "Locked chapters use points.",
      description:
        lockedCount > 0
          ? `${lockedCount.toLocaleString()} chapter${lockedCount === 1 ? "" : "s"} are currently locked on this list.`
          : "Everything visible here is already ready to open.",
    },
    {
      label: "Read often?",
      title: isSubscriber ? "Membership is already active." : "Membership may fit heavy reading better.",
      description: isSubscriber
        ? "Your member access is already on, so compare the list against the perks you are using."
        : "If you keep topping up for multiple series, compare membership before your next pack purchase.",
    },
  ];

  return (
    <section className="mt-6 rounded-[28px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:mt-8 sm:p-6" data-wallet-total={walletTotal}>
      <div className="mb-5 border-b border-black/6 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-950">Episodes</h2>
              <span className="text-sm text-slate-500">{episodes.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summaryItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-black/8 bg-white/84 px-3 py-1.5 text-xs text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {seriesProgress?.lastEpisodeId ? (
              <button
                type="button"
                onClick={() => onRead(series?.id, seriesProgress.lastEpisodeId)}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Continue reading
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                router.push(
                  buildPathWithAttribution(
                    "/store",
                    {
                      entryPoint: "SERIES_EPISODE_LIST",
                      sourcePath: `/series/${series?.id}`,
                      sourceSeriesId: series?.id,
                      returnTo: `/series/${series?.id}`,
                    },
                    { focus: "auto" }
                  )
                )
              }
              className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
            >
              {STOREFRONT_TERMS.viewPointPacks}
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  buildPathWithAttribution("/subscribe", {
                    entryPoint: "SERIES_EPISODE_LIST",
                    sourcePath: `/series/${series?.id}`,
                    sourceSeriesId: series?.id,
                    returnTo: `/series/${series?.id}`,
                  })
                )
              }
              className="rounded-full border border-black/8 bg-[#f8f9fc] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-white"
            >
              {STOREFRONT_TERMS.compareMembership}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {accessGuides.map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] border border-black/6 bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-full border border-black/8 bg-white/88 px-3 py-2 text-xs text-slate-700 outline-none transition-colors focus:border-[var(--gush-accent,#2f6bff)]"
          >
            <option value="all">All</option>
            <option value="locked">Locked</option>
            <option value="unlocked">Unlocked</option>
            <option value="ttf">Free reads</option>
          </select>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="rounded-full border border-black/8 bg-white/88 px-3 py-2 text-xs text-slate-700 outline-none transition-colors focus:border-[var(--gush-accent,#2f6bff)]"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          <span className="text-xs text-slate-500">
            {sortedEpisodes.length} visible
          </span>
        </div>
      </div>
      {sortedEpisodes.length === 0 ? (
        <div className="rounded-[24px] border border-black/6 bg-white/84 p-6 text-sm text-slate-600">
          <p className="text-base font-semibold text-slate-950">No episodes found</p>
          <p className="mt-2 text-sm text-slate-500">
            {filter === "all"
              ? "Episodes will appear here once available."
              : "Try a different filter to see more episodes."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sortedEpisodes.map((episode, index) => {
            const key = episode?.id || `${series.id || "series"}-${index}`;
            const unlocked = unlockedEpisodeIds.includes(episode?.id);
            const progress = series?.id ? getProgress(series.id) : null;
            const ttfEligible = Boolean(
              episode?.ttfEligible && series?.ttf?.enabled
            );
            const ttfStatus = {
              eligible: ttfEligible,
              readyAt: episode?.ttfReadyAt || null,
            };
            const pricePts =
              episode?.pricePts ?? series?.pricing?.episodePrice ?? 0;
            const nowMsForRow = !unlocked && ttfEligible ? nowMs : null;
            return (
              <EpisodeRow
                key={key}
                episode={episode}
                seriesId={series?.id}
                unlocked={unlocked}
                ttfStatus={ttfStatus}
                pricePts={pricePts}
                coupons={coupons}
                progress={progress}
                nowMs={nowMsForRow}
                onRead={onRead}
                onUnlock={onUnlock}
                onClaim={onClaim}
                onSubscribe={onSubscribe}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
