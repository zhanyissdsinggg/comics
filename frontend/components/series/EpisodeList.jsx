"use client";

import { useEffect, useMemo, useState } from "react";
import EpisodeRow from "./EpisodeRow";
import { useProgressStore } from "../../store/useProgressStore";
import {
  EPISODE_PRIMARY_STATE_META,
  EPISODE_PRIMARY_STATE_ORDER,
  buildEpisodeAccessStateMap,
  getEpisodeAvailabilitySummary,
} from "../../lib/episodeAccessState";

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
  const [sortOrder, setSortOrder] = useState("oldest");
  const [filter, setFilter] = useState("all");
  const unlockedEpisodeIds = useMemo(
    () => entitlement?.unlockedEpisodeIds || [],
    [entitlement?.unlockedEpisodeIds],
  );
  const walletTotal = (wallet?.paidPts || 0) + (wallet?.bonusPts || 0);
  const totalEpisodes = Array.isArray(episodes) ? episodes.length : 0;
  const [nowMs, setNowMs] = useState(() => Date.now());

  const episodeStateMap = useMemo(() => {
    return buildEpisodeAccessStateMap({
      episodes,
      unlockedEpisodeIds,
      subscription: wallet?.subscription,
      subscriptionUsage: wallet?.subscriptionUsage,
      coupons,
      nowMs,
      fallbackPrice: series?.pricing?.episodePrice ?? 0,
    });
  }, [
    coupons,
    episodes,
    nowMs,
    series?.pricing?.episodePrice,
    unlockedEpisodeIds,
    wallet?.subscription,
    wallet?.subscriptionUsage,
  ]);

  const availabilitySummary = useMemo(
    () =>
      getEpisodeAvailabilitySummary({
        episodes,
        episodeStateMap,
      }),
    [episodeStateMap, episodes],
  );
  const availabilityCounts = availabilitySummary.counts;

  const needsCountdown = useMemo(
    () => availabilitySummary.hasCountdown,
    [availabilitySummary.hasCountdown],
  );

  useEffect(() => {
    if (!needsCountdown) {
      return undefined;
    }
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [needsCountdown]);

  const filteredEpisodes = useMemo(() => {
    const list = Array.isArray(episodes) ? episodes : [];
    if (filter !== "all") {
      return list.filter((episode) => episodeStateMap.get(episode?.id)?.primaryState === filter);
    }
    return list;
  }, [episodeStateMap, episodes, filter]);

  const sortedEpisodes = useMemo(
    () => sortEpisodes(filteredEpisodes, sortOrder),
    [filteredEpisodes, sortOrder],
  );

  const filterOptions = useMemo(
    () => [
      { value: "all", label: "All" },
      ...EPISODE_PRIMARY_STATE_ORDER.filter((state) => {
        if (availabilityCounts[state] <= 0) {
          return false;
        }
        if (
          state === "free" &&
          EPISODE_PRIMARY_STATE_ORDER.every(
            (candidate) => candidate === "free" || availabilityCounts[candidate] <= 0,
          )
        ) {
          return false;
        }
        return true;
      }).map(
        (state) => ({
          value: state,
          label: EPISODE_PRIMARY_STATE_META[state].filterLabel,
        }),
      ),
    ],
    [availabilityCounts],
  );
  const showFilterControl = filterOptions.length > 1;
  const showSortControl = totalEpisodes > 1;

  useEffect(() => {
    if (filter === "all") {
      return;
    }
    if (!filterOptions.some((option) => option.value === filter)) {
      setFilter("all");
    }
  }, [filter, filterOptions]);

  return (
    <section
      className="mt-6 rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,246,242,0.92))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-md sm:mt-8 sm:p-6"
      data-wallet-total={walletTotal}
    >
      <div className="mb-5 border-b border-black/8 pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">Episodes</h2>
              <span className="text-sm text-slate-500">{totalEpisodes}</span>
            </div>
          </div>
        </div>

        {showFilterControl || showSortControl ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <div className={`grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 ${showFilterControl && showSortControl ? "grid-cols-2" : "grid-cols-1"}`}>
              {showFilterControl ? (
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="min-h-[44px] rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-[var(--gush-accent,#3157d6)]"
                >
                  {filterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
              {showSortControl ? (
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="min-h-[44px] rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-[var(--gush-accent,#3157d6)]"
                >
                  <option value="oldest">Oldest first</option>
                  <option value="newest">Newest first</option>
                </select>
              ) : null}
            </div>
          </div>
        ) : null}
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
        <ul className="space-y-2.5">
          {sortedEpisodes.map((episode, index) => {
            const key = episode?.id || `${series.id || "series"}-${index}`;
            const unlocked = unlockedEpisodeIds.includes(episode?.id);
            const progress = series?.id ? getProgress(series.id) : null;
            const ttfEligible = Boolean(episode?.ttfEligible && series?.ttf?.enabled);
            const ttfStatus = {
              eligible: ttfEligible,
              readyAt: episode?.ttfReadyAt || null,
            };
            const pricePts = episode?.pricePts ?? series?.pricing?.episodePrice ?? 0;
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
