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
import { getEpisodeCommerceAccess } from "../../lib/seriesCommerce";

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
  const neutralChipClass =
    "rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1.5 text-xs text-[color:var(--gush-ink-soft)]";
  const filterControlClass =
    "min-h-[44px] rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-2.5 text-sm text-[color:var(--gush-ink)] outline-none transition-colors focus:border-[color:var(--gush-border-strong)] focus:ring-2 focus:ring-slate-200/80";
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
      fallbackPrice: 0,
    });
  }, [
    coupons,
    episodes,
    nowMs,
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
  const availabilityChips = useMemo(
    () => availabilitySummary.summaryItems.slice(0, 4),
    [availabilitySummary.summaryItems],
  );

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
      return list.filter(
        (episode) => episodeStateMap.get(episode?.id)?.primaryState === filter,
      );
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
            (candidate) =>
              candidate === "free" || availabilityCounts[candidate] <= 0,
          )
        ) {
          return false;
        }
        return true;
      }).map((state) => ({
        value: state,
        label: EPISODE_PRIMARY_STATE_META[state].filterLabel,
      })),
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
      className="mt-6 overflow-hidden rounded-[30px] border border-[color:var(--gush-border)] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:mt-8"
      data-wallet-total={walletTotal}
    >
      <div className="border-b border-[color:var(--gush-border)] px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              <span>Episodes</span>
              <span className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-2.5 py-1 text-[10px] tracking-[0.2em] text-slate-600">
                {totalEpisodes.toLocaleString()}
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                Episode list
              </h2>
              {availabilitySummary.entryHint ||
              availabilitySummary.entryLabel ? (
                <p className="max-w-2xl text-sm leading-7 text-slate-600">
                  {availabilitySummary.entryHint ||
                    availabilitySummary.entryLabel}
                </p>
              ) : null}
            </div>

            {availabilityChips.length > 0 ? (
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                {availabilityChips.map((item) => (
                  <span
                    key={`episode-summary-${item}`}
                    className={neutralChipClass}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {showFilterControl || showSortControl ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
              <div
                className={`grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 ${showFilterControl && showSortControl ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {showFilterControl ? (
                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className={filterControlClass}
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
                    className={filterControlClass}
                  >
                    <option value="oldest">Oldest first</option>
                    <option value="newest">Newest first</option>
                  </select>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        {sortedEpisodes.length === 0 ? (
          <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-6 text-sm text-slate-600">
            <p className="text-base font-semibold text-slate-950">
              No episodes yet.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {filter === "all"
                ? "Episodes will appear here once available."
                : "Try another filter."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sortedEpisodes.map((episode, index) => {
              const key = episode?.id || `${series.id || "series"}-${index}`;
              const unlocked = unlockedEpisodeIds.includes(episode?.id);
              const progress = series?.id ? getProgress(series.id) : null;
              const episodeAccess = getEpisodeCommerceAccess(episode);
              const ttfEligible = Boolean(episodeAccess?.ttfEligible);
              const ttfStatus = {
                eligible: ttfEligible,
                readyAt: episodeAccess?.ttfReadyAt || null,
              };
              const pricePts = episodeAccess?.pricePts ?? 0;
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
      </div>
    </section>
  );
}
