"use client";

import useCountdown from "../../hooks/useCountdown";
import Pill from "../common/Pill";

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "Unknown date";
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(parsed));
}

export default function EpisodeRow({
  episode,
  seriesId,
  unlocked,
  ttfStatus,
  pricePts,
  onRead,
  onUnlock,
  onClaim,
  onSubscribe,
}) {
  const readyAtMs = ttfStatus?.readyAt ? Date.parse(ttfStatus.readyAt) : null;
  const { isReady, formatted } = useCountdown(readyAtMs);

  let actionNode = null;
  let metaNode = null;

  if (unlocked) {
    actionNode = (
      <button type="button" onClick={() => onRead(seriesId, episode?.id)}>
        Read
      </button>
    );
  } else if (ttfStatus?.eligible && isReady) {
    metaNode = <span>Free</span>;
    actionNode = (
      <button type="button" onClick={() => onClaim(seriesId, episode?.id)}>
        Claim Free
      </button>
    );
  } else if (ttfStatus?.eligible && !isReady) {
    metaNode = <span>TTF in {formatted || "--:--:--"}</span>;
    actionNode = (
      <button type="button" onClick={() => onSubscribe(seriesId, episode?.id)}>
        Subscribe
      </button>
    );
  } else {
    actionNode = (
      <button type="button" onClick={() => onUnlock(seriesId, episode?.id)}>
        Unlock ({pricePts} PTS)
      </button>
    );
  }

  return (
    <li className="series-episode">
      <div className="episode-info">
        <div className="episode-title">
          <strong>
            Ep {episode?.number} {episode?.title}
          </strong>
          {unlocked ? <Pill>Unlocked</Pill> : null}
        </div>
        <div className="episode-subtitle">
          <span>{formatDate(episode?.releasedAt)}</span>
          {episode?.previewFreePages ? (
            <span>Preview {episode.previewFreePages} pages</span>
          ) : null}
        </div>
      </div>
      <div className="episode-cta">
        {metaNode}
        {actionNode}
      </div>
    </li>
  );
}
