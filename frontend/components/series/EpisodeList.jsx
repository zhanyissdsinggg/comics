"use client";

import { useEffect, useMemo, useState } from "react";
import EpisodeRow from "./EpisodeRow";
import { useProgressStore } from "../../store/useProgressStore";

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
  const { getProgress } = useProgressStore();
  const [sortOrder, setSortOrder] = useState("newest");
  const [filter, setFilter] = useState("all");
  const unlockedEpisodeIds = useMemo(
    () => entitlement?.unlockedEpisodeIds || [],
    [entitlement?.unlockedEpisodeIds]
  );
  const walletTotal = (wallet?.paidPts || 0) + (wallet?.bonusPts || 0);
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

  return (
    <section className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:mt-8 sm:p-6" data-wallet-total={walletTotal}>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">Episodes</h2>
          <span className="text-sm text-neutral-500">{episodes.length}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-neutral-200 outline-none transition-colors focus:border-emerald-400/40"
          >
            <option value="all">All</option>
            <option value="locked">Locked</option>
            <option value="unlocked">Unlocked</option>
            <option value="ttf">Free unlocks</option>
          </select>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-neutral-200 outline-none transition-colors focus:border-emerald-400/40"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>
      {sortedEpisodes.length === 0 ? (
        <div className="rounded-[24px] border border-white/10 bg-black/20 p-6 text-sm text-neutral-300">
          <p className="text-base font-semibold text-white">No episodes found</p>
          <p className="mt-2 text-sm text-neutral-500">
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
