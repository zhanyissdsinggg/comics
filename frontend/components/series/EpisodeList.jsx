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
  const summaryCards = [
    {
      label: "Ready now",
      value: unlockedEpisodeIds.length.toLocaleString(),
      hint: lockedCount > 0 ? `${lockedCount.toLocaleString()} chapter${lockedCount === 1 ? "" : "s"} still locked` : "Everything in this series is ready to read",
    },
    {
      label: "Free options",
      value: freeUnlockCount.toLocaleString(),
      hint: freePreviewCount > 0
        ? `${freePreviewCount.toLocaleString()} episode${freePreviewCount === 1 ? "" : "s"} offer preview pages`
        : "Free unlock timers and previews reduce first-session friction",
    },
    {
      label: "Wallet",
      value: walletTotal.toLocaleString(),
      hint: walletTotal > 0 ? "Points available right now" : "Top up when the next chapter needs points",
    },
    {
      label: "Unlock mode",
      value: isSubscriber ? "Member" : "Points",
      hint: isSubscriber
        ? "Membership perks and daily free unlocks are active"
        : "Use points or compare membership before the paywall hits",
    },
  ];

  return (
    <section className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:mt-8 sm:p-6" data-wallet-total={walletTotal}>
      <div className="mb-6 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
            {STOREFRONT_TERMS.readingDesk}
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
            See what is free, unlocked, and worth opening next.
          </h2>
          <p className="mt-3 text-sm leading-7 text-neutral-400">
            Strong series pages make the next chapter feel obvious. You should be able to tell what is already open,
            what can be tried for free, and when points or membership make more sense.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {seriesProgress?.lastEpisodeId ? (
              <button
                type="button"
                onClick={() => onRead(series?.id, seriesProgress.lastEpisodeId)}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
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
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
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
              className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-400/15"
            >
              {STOREFRONT_TERMS.compareMembership}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                {card.label}
              </p>
              <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{card.hint}</p>
            </div>
          ))}
        </div>
      </div>

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
