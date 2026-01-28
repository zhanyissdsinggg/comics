"use client";

import { useMemo, useState } from "react";
import EpisodeRow from "./EpisodeRow";

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
  onRead,
  onUnlock,
  onClaim,
  onSubscribe,
}) {
  const [sortOrder, setSortOrder] = useState("newest");
  const unlockedEpisodeIds = entitlement?.unlockedEpisodeIds || [];
  const walletTotal = (wallet?.paidPts || 0) + (wallet?.bonusPts || 0);
  const sortedEpisodes = useMemo(
    () => sortEpisodes(episodes, sortOrder),
    [episodes, sortOrder]
  );

  return (
    <section className="series-episodes" data-wallet-total={walletTotal}>
      <div className="episode-toolbar">
        <div className="episode-toolbar-title">
          <h2>Episodes</h2>
          <span>{episodes.length}</span>
        </div>
        <div className="episode-toolbar-controls">
          <label>
            Sort
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </label>
        </div>
      </div>
      <ul>
        {sortedEpisodes.map((episode, index) => {
          const key = episode?.id || `${series.id || "series"}-${index}`;
          const unlocked = unlockedEpisodeIds.includes(episode?.id);
          const ttfEligible = Boolean(
            episode?.ttfEligible && series?.ttf?.enabled
          );
          const ttfStatus = {
            eligible: ttfEligible,
            readyAt: episode?.ttfReadyAt || null,
          };
          const pricePts =
            episode?.pricePts ?? series?.pricing?.episodePrice ?? 0;
          return (
            <EpisodeRow
              key={key}
              episode={episode}
              seriesId={series?.id}
              unlocked={unlocked}
              ttfStatus={ttfStatus}
              pricePts={pricePts}
              onRead={onRead}
              onUnlock={onUnlock}
              onClaim={onClaim}
              onSubscribe={onSubscribe}
            />
          );
        })}
      </ul>
    </section>
  );
}
