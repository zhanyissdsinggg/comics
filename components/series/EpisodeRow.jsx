"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useCountdown from "../../hooks/useCountdown";
import Pill from "../common/Pill";
import ActionModal from "./ActionModal";
import { useWalletStore } from "../../store/useWalletStore";
import { track } from "../../lib/analytics";

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

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
  const router = useRouter();
  const { topup } = useWalletStore();
  const [modalState, setModalState] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const readyAtMs = ttfStatus?.readyAt ? Date.parse(ttfStatus.readyAt) : null;
  const { isReady, formatted } = useCountdown(readyAtMs);

  let actionNode = null;
  let metaNode = null;

  if (unlocked) {
    actionNode = (
      <button
        type="button"
        onClick={() => onRead(seriesId, episode?.id)}
        disabled={isWorking}
      >
        Read
      </button>
    );
  } else if (ttfStatus?.eligible && isReady) {
    metaNode = <span>Free</span>;
    actionNode = (
      <button
        type="button"
        onClick={async () => {
          setIsWorking(true);
          track("ttf_claim", { seriesId, episodeId: episode?.id });
          let response;
          try {
            response = await onClaim(seriesId, episode?.id);
          } catch (err) {
            response = { ok: false, status: 500, error: "CLAIM_FAILED" };
          }
          if (response.ok) {
            track("ttf_claim_success", { seriesId, episodeId: episode?.id });
            setModalState({
              type: "SUCCESS",
              title: "Claimed",
              description: "Free claim successful.",
            });
          } else {
            track("ttf_claim_fail", {
              seriesId,
              episodeId: episode?.id,
              status: response.status,
              errorCode: response.error,
              requestId: response.requestId,
            });
            const description =
              response.status === 409
                ? "TTF not ready."
                : response.error || "Claim failed.";
            setModalState({
              type: "ERROR",
              title: "Claim failed",
              description,
            });
          }
          setIsWorking(false);
        }}
        disabled={isWorking}
      >
        Claim Free
      </button>
    );
  } else if (ttfStatus?.eligible && !isReady) {
    metaNode = <span>TTF in {formatted || "--:--:--"}</span>;
    actionNode = (
      <button
        type="button"
        onClick={() => onSubscribe(seriesId, episode?.id)}
        disabled={isWorking}
      >
        Subscribe
      </button>
    );
  } else {
    actionNode = (
      <button
        type="button"
        onClick={async () => {
          setIsWorking(true);
          track("click_unlock", { seriesId, episodeId: episode?.id });
          const idempotencyKey = createIdempotencyKey();
          let response;
          try {
            response = await onUnlock(seriesId, episode?.id, idempotencyKey);
          } catch (err) {
            response = { ok: false, status: 500, error: "UNLOCK_FAILED" };
          }
          if (response.ok) {
            track("unlock_success", { seriesId, episodeId: episode?.id });
            setModalState({
              type: "SUCCESS",
              title: "Unlocked",
              description: "Episode unlocked successfully.",
            });
            setIsWorking(false);
            return;
          }

          track("unlock_fail", {
            seriesId,
            episodeId: episode?.id,
            status: response.status,
            errorCode: response.error,
            requestId: response.requestId,
          });

          if (response.status === 402) {
            setModalState({
              type: "SHORTFALL",
              title: "Not enough points",
              description: "Not enough points to unlock this episode.",
              shortfallPts: response.shortfallPts || 0,
            });
          } else {
            setModalState({
              type: "ERROR",
              title: "Unlock failed",
              description: response.error || "Please try again.",
            });
          }
          setIsWorking(false);
        }}
        disabled={isWorking}
      >
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
      <ActionModal
        open={Boolean(modalState)}
        type={modalState?.type}
        title={modalState?.title}
        description={modalState?.description}
        shortfallPts={modalState?.shortfallPts}
        actions={
          modalState?.type === "SHORTFALL"
            ? [
                {
                  label: "Go to Store",
                  onClick: () => {
                    router.push(`/store?returnTo=/series/${seriesId}&focus=starter`);
                    setModalState(null);
                  },
                  variant: "secondary",
                },
                {
                  label: "Quick Topup",
                  onClick: async () => {
                    const topupResponse = await topup("starter");
                    if (topupResponse.ok) {
                      let retry;
                      try {
                        const retryKey = createIdempotencyKey();
                        retry = await onUnlock(seriesId, episode?.id, retryKey);
                      } catch (err) {
                        retry = { ok: false };
                      }
                      if (retry.ok) {
                        track("unlock_success", {
                          seriesId,
                          episodeId: episode?.id,
                          retry: true,
                        });
                        setModalState({
                          type: "SUCCESS",
                          title: "Unlocked",
                          description: "Episode unlocked successfully.",
                        });
                        return;
                      }
                    }
                    track("unlock_fail", {
                      seriesId,
                      episodeId: episode?.id,
                      retry: true,
                      errorCode: retry?.error,
                      requestId: retry?.requestId,
                    });
                    setModalState({
                      type: "ERROR",
                      title: "Topup failed",
                      description: "Unable to top up and unlock.",
                    });
                  },
                  variant: "primary",
                },
              ]
            : null
        }
        onClose={() => setModalState(null)}
      />
    </li>
  );
}
