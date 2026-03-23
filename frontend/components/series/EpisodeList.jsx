"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EpisodeRow from "./EpisodeRow";
import { useProgressStore } from "../../store/useProgressStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import {
  EPISODE_PRIMARY_STATE_META,
  EPISODE_PRIMARY_STATE_ORDER,
  buildEpisodeAccessStateMap,
  getEpisodeAvailabilitySummary,
  getSeriesPrimaryReadAction,
} from "../../lib/episodeAccessState";

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function openAuthModal() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent("auth:open"));
}

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
  isSignedIn = false,
  onRead,
  onUnlock,
  onClaim,
  onSubscribe,
}) {
  const router = useRouter();
  const { getProgress } = useProgressStore();
  const [sortOrder, setSortOrder] = useState("oldest");
  const [filter, setFilter] = useState("all");
  const [topActionWorking, setTopActionWorking] = useState(false);
  const unlockedEpisodeIds = useMemo(
    () => entitlement?.unlockedEpisodeIds || [],
    [entitlement?.unlockedEpisodeIds],
  );
  const seriesProgress = series?.id ? getProgress(series.id) : null;
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

  const primaryReadAction = useMemo(
    () =>
      getSeriesPrimaryReadAction({
        series,
        episodes,
        progress: seriesProgress,
        unlockedEpisodeIds,
        subscription: wallet?.subscription,
        subscriptionUsage: wallet?.subscriptionUsage,
        coupons,
        nowMs,
        isSignedIn,
      }),
    [
      coupons,
      episodes,
      isSignedIn,
      nowMs,
      series,
      seriesProgress,
      unlockedEpisodeIds,
      wallet?.subscription,
      wallet?.subscriptionUsage,
    ],
  );

  const primaryEpisode = useMemo(
    () =>
      primaryReadAction?.episodeId
        ? (Array.isArray(episodes) ? episodes : []).find(
            (episode) => episode?.id === primaryReadAction.episodeId,
          ) || null
        : null,
    [episodes, primaryReadAction?.episodeId],
  );
  const primaryEpisodeState = primaryEpisode
    ? episodeStateMap.get(primaryEpisode.id) || null
    : null;

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

  const summaryItems = availabilitySummary.summaryItems;
  const mobileSummary = availabilitySummary.mobileSummary;
  const explainer = availabilitySummary.explainer;

  const filterOptions = useMemo(
    () => [
      { value: "all", label: "All chapters" },
      ...EPISODE_PRIMARY_STATE_ORDER.filter((state) => availabilityCounts[state] > 0).map(
        (state) => ({
          value: state,
          label: EPISODE_PRIMARY_STATE_META[state].filterLabel,
        }),
      ),
    ],
    [availabilityCounts],
  );

  useEffect(() => {
    if (filter === "all") {
      return;
    }
    if (!filterOptions.some((option) => option.value === filter)) {
      setFilter("all");
    }
  }, [filter, filterOptions]);

  const handleOpenStore = () =>
    router.push(
      buildPathWithAttribution(
        "/store",
        {
          entryPoint: "SERIES_EPISODE_LIST",
          sourcePath: `/series/${series?.id}`,
          sourceSeriesId: series?.id,
          returnTo: `/series/${series?.id}`,
        },
        { focus: "auto" },
      ),
    );

  const handleOpenMembership = () =>
    router.push(
      buildPathWithAttribution("/subscribe", {
        entryPoint: "SERIES_EPISODE_LIST",
        sourcePath: `/series/${series?.id}`,
        sourceSeriesId: series?.id,
        returnTo: `/series/${series?.id}`,
      }),
    );

  const primaryActionKind =
    primaryReadAction?.actionKind || primaryEpisodeState?.actionKind || null;
  const primaryActionNote =
    primaryReadAction?.note && primaryReadAction.note !== explainer
      ? primaryReadAction.note
      : "";

  const handlePrimaryAction = async () => {
    if (topActionWorking) {
      return;
    }

    if (!primaryReadAction?.episodeId || !primaryEpisode || !primaryActionKind) {
      if (primaryActionKind === "subscribe") {
        onSubscribe(series?.id, primaryReadAction?.episodeId || null);
      }
      return;
    }

    if (primaryActionKind === "subscribe") {
      onSubscribe(series?.id, primaryEpisode.id);
      return;
    }

    if (primaryActionKind === "read" || primaryActionKind === "preview") {
      onRead(series?.id, primaryEpisode.id);
      return;
    }

    if (primaryActionKind === "claim") {
      setTopActionWorking(true);
      let response;
      try {
        response = await onClaim(series?.id, primaryEpisode.id);
      } catch {
        response = { ok: false, status: 500, error: "CLAIM_FAILED" };
      }
      if (response.ok) {
        onRead(series?.id, primaryEpisode.id);
      } else if (response.status === 401) {
        openAuthModal();
      }
      setTopActionWorking(false);
      return;
    }

    if (primaryActionKind === "unlock") {
      setTopActionWorking(true);
      const idempotencyKey = createIdempotencyKey();
      let response;
      try {
        response = await onUnlock(series?.id, primaryEpisode.id, idempotencyKey);
      } catch {
        response = { ok: false, status: 500, error: "UNLOCK_FAILED" };
      }

      if (response.ok) {
        onRead(series?.id, primaryEpisode.id);
      } else if (response.status === 401) {
        openAuthModal();
      } else if (response.status === 402) {
        handleOpenStore();
      }
      setTopActionWorking(false);
    }
  };

  const topActionClassName =
    primaryActionKind === "subscribe"
      ? "rounded-full border border-black/8 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-60"
      : primaryActionKind === "unlock"
        ? "rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        : "rounded-full bg-[var(--gush-accent,#2f6bff)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#255af0] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <section
      className="mt-6 rounded-[28px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,246,242,0.94))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-md sm:mt-8 sm:p-6"
      data-wallet-total={walletTotal}
    >
      <div className="mb-5 border-b border-black/8 pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-950">Episodes</h2>
              <span className="text-sm text-slate-500">{totalEpisodes}</span>
            </div>
            <p className="text-sm leading-6 text-slate-600">{explainer}</p>
            {mobileSummary ? (
              <p className="text-sm font-medium text-slate-500 sm:hidden">{mobileSummary}</p>
            ) : null}
            {summaryItems.length > 0 ? (
              <div className="hidden flex-wrap gap-2 sm:flex">
                {summaryItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-black/8 bg-[rgba(246,243,237,0.92)] px-3 py-1.5 text-xs text-slate-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {primaryReadAction?.label ? (
            <div className="rounded-[24px] border border-black/8 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] xl:min-w-[320px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Start here
              </p>
              {primaryActionNote ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {primaryActionNote}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={topActionWorking}
                  className={topActionClassName}
                >
                  {topActionWorking ? "Working..." : primaryReadAction.label}
                </button>
                {seriesProgress?.lastEpisodeId && primaryReadAction.label !== "Continue Reading" ? (
                  <button
                    type="button"
                    onClick={() => onRead(series?.id, seriesProgress.lastEpisodeId)}
                    className="rounded-full border border-black/8 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                  >
                    Continue Reading
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
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
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="min-h-[44px] rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-[var(--gush-accent,#3157d6)]"
            >
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
            </select>
          </div>
          <div className="hidden flex-wrap items-center gap-2 sm:flex sm:gap-3">
            <button
              type="button"
              onClick={handleOpenStore}
              className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
            >
              {STOREFRONT_TERMS.viewPointPacks}
            </button>
            <button
              type="button"
              onClick={handleOpenMembership}
              className="rounded-full border border-black/8 bg-[rgba(246,243,237,0.92)] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-white"
            >
              {STOREFRONT_TERMS.compareMembership}
            </button>
          </div>
          <span className="text-xs text-slate-500 sm:ml-auto">{sortedEpisodes.length} visible</span>
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
