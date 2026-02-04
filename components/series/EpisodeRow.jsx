"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Pill from "../common/Pill";
import ActionModal from "./ActionModal";
import { useWalletStore } from "../../store/useWalletStore";
import { track } from "../../lib/analytics";
import { decideOffers } from "../../lib/offers/decide";
import { getBucket, getOrCreateUserId, trackExposure } from "../../lib/experiments/ab";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { calculatePrice } from "../../lib/pricing";

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

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function EpisodeRow({
  episode,
  seriesId,
  unlocked,
  ttfStatus,
  pricePts,
  coupons,
  progress,
  nowMs,
  onRead,
  onUnlock,
  onClaim,
  onSubscribe,
}) {
  const router = useRouter();
  const { topup } = useWalletStore();
  const { paidPts, bonusPts, subscription, subscriptionUsage } = useWalletStore();
  const { isAdultMode } = useAdultGateStore();
  const { unlockEpisode: recordUnlock } = useBehaviorStore();
  const [modalState, setModalState] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const impressionRef = useRef(false);
  const readyAtMs = ttfStatus?.readyAt ? Date.parse(ttfStatus.readyAt) : null;
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  const remainingMs = readyAtMs ? readyAtMs - now : null;
  const isReady = !readyAtMs ? true : remainingMs <= 0;
  const formatted = isReady ? null : formatCountdown(remainingMs);

  const isSubscriber = Boolean(subscription?.active);
  const isNewPayer =
    typeof window !== "undefined"
      ? window.localStorage.getItem("mn_has_purchased") !== "1"
      : true;
  const userId = typeof window !== "undefined" ? getOrCreateUserId() : "guest";

  const bucketMap = useMemo(() => {
    const map = {
      unlock_offer_v1: getBucket(userId, "unlock_offer_v1"),
      topup_offer_v1: getBucket(userId, "topup_offer_v1"),
      subscribe_upsell_v1: getBucket(userId, "subscribe_upsell_v1"),
    };
    return map;
  }, [userId]);

  useEffect(() => {
    Object.entries(bucketMap).forEach(([experimentId, bucket]) => {
      trackExposure(experimentId, bucket);
    });
  }, [bucketMap]);

  const offerDecision = useMemo(
    () =>
      decideOffers({
        user: {
          isSubscriber,
          paidPts,
          bonusPts,
          isNewPayer,
          region: "global",
          isAdultMode,
        },
        content: {
          seriesId,
          episodeId: episode?.id,
          pricePts,
          isAdult: false,
          ttfEligible: ttfStatus?.eligible,
        },
        entry: "UNLOCK_MODAL",
        experiments: { bucketMap },
      }),
    [
      isSubscriber,
      paidPts,
      bonusPts,
      isNewPayer,
      isAdultMode,
      seriesId,
      episode?.id,
      pricePts,
      ttfStatus?.eligible,
      bucketMap,
    ]
  );

  const recommendedTopup = offerDecision.recommendedTopupOffer;
  const recommendedUnlockOffer = offerDecision.recommendedUnlockOffer;
  const offerBadge = recommendedUnlockOffer?.tag;
  const savingsText = recommendedUnlockOffer?.savingsPct
    ? `You save ${recommendedUnlockOffer.savingsPct}%`
    : null;
  const pricing = useMemo(
    () =>
      calculatePrice({
        basePrice: pricePts,
        subscription: subscription?.active ? subscription : null,
        coupons,
        method: "WALLET",
        applyDailyFree: Boolean(subscriptionUsage?.remaining),
      }),
    [pricePts, subscription, coupons, subscriptionUsage?.remaining]
  );
  const effectivePrice = pricing.finalPrice ?? pricePts;
  const discountLabel =
    pricing.appliedCoupon?.label ||
    (pricing.discountPct ? `Subscriber ${pricing.discountPct}% off` : "");
  const dailyFreeLabel =
    !unlocked && subscriptionUsage?.remaining ? "Daily free available" : "";
  const compareItems =
    modalState?.type === "SHORTFALL" && recommendedUnlockOffer?.episodes > 1
      ? [
          { label: "Single", value: `${pricePts} POINTS` },
          {
            label: `${recommendedUnlockOffer.episodes} Pack`,
            value: `${recommendedUnlockOffer.pricePts} POINTS`,
          },
        ]
      : [];
  const unlockTips =
    modalState?.type === "SHORTFALL"
      ? [
          "Unlock keeps this episode in your library.",
          "Packs save more POINTS on future episodes.",
          "Subscribers get daily free unlocks and faster TTF.",
        ]
      : [];
  const subscribeUpsellTips =
    modalState?.type === "SHORTFALL"
      ? [
          "Subscribe to unlock daily free chapters.",
          "TTF cooldown is shorter with subscription perks.",
        ]
      : [];

  useEffect(() => {
    if (modalState?.type !== "SHORTFALL") {
      impressionRef.current = false;
      return;
    }
    if (impressionRef.current) {
      return;
    }
    if (recommendedUnlockOffer?.id) {
      track("offer_impression", { offerId: recommendedUnlockOffer.id, entry: "UNLOCK_MODAL" });
      impressionRef.current = true;
    }
  }, [modalState?.type, recommendedUnlockOffer?.id]);

  let actionNode = null;
  let metaNode = null;

  if (unlocked) {
    actionNode = (
      <button
        type="button"
        onClick={() => onRead(seriesId, episode?.id)}
        disabled={isWorking}
        className="min-h-[44px] rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:scale-95 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ willChange: "transform" }}
      >
        Read
      </button>
    );
    if (progress?.lastEpisodeId === episode?.id && progress?.percent && progress.percent > 0) {
      metaNode = (
        <span>{Math.round(progress.percent * 100)}% read</span>
      );
    }
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
            if (response.status === 401) {
              openAuthModal();
            }
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
        className="min-h-[44px] rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:scale-95 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ willChange: "transform" }}
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
        className="min-h-[44px] rounded-full border border-neutral-700 bg-neutral-900 px-6 py-2 text-sm font-semibold text-neutral-300 transition-all hover:border-neutral-600 hover:bg-neutral-800 active:scale-95 active:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ willChange: "transform" }}
      >
        Subscribe for perks
      </button>
    );
  } else {
    if (pricing.appliedDailyFree) {
      metaNode = <span>Daily free available</span>;
    } else if (effectivePrice !== pricePts) {
      metaNode = <span>{discountLabel || "Discount applied"}</span>;
    }
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
            recordUnlock(seriesId, episode?.id);
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

          if (response.status === 401) {
            openAuthModal();
            setModalState({
              type: "ERROR",
              title: "Sign in required",
              description: "Please sign in to unlock this episode.",
            });
          } else if (response.status === 402) {
            setModalState({
              type: "SHORTFALL",
              title: "Not enough POINTS",
              description: "Not enough POINTS to unlock this episode.",
              shortfallPts: response.shortfallPts || 0,
              offerId: recommendedTopup?.id,
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
        className="min-h-[44px] rounded-full bg-white px-6 py-2 text-sm font-semibold text-neutral-900 transition-all hover:bg-emerald-50 active:scale-95 active:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ willChange: "transform" }}
      >
        {effectivePrice === 0 ? "Unlock Free" : `Unlock (${effectivePrice} POINTS)`}
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
          {ttfStatus?.eligible && isReady ? <Pill>Free to Read</Pill> : null}
          {progress?.lastEpisodeId === episode?.id ? <Pill>Last read</Pill> : null}
        </div>
        <div className="episode-subtitle">
          <span>{formatDate(episode?.releasedAt)}</span>
          {episode?.previewFreePages ? (
            <span>Preview {episode.previewFreePages} pages</span>
          ) : null}
        </div>
        {progress?.lastEpisodeId === episode?.id ? (
          <div className="mt-2 h-1 w-full rounded-full bg-neutral-900">
            <div
              className="h-full rounded-full bg-emerald-400/70"
              style={{ width: `${Math.round((progress.percent || 0) * 100)}%` }}
            />
          </div>
        ) : null}
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
        offer={modalState?.type === "SHORTFALL" ? recommendedTopup : recommendedUnlockOffer}
        offerBadge={modalState?.type === "SHORTFALL" ? recommendedTopup?.tag : offerBadge}
        offerSavingsText={modalState?.type === "SHORTFALL" ? null : savingsText}
        compareItems={compareItems}
        tips={[...unlockTips, ...subscribeUpsellTips]}
        actions={
          modalState?.type === "SHORTFALL"
            ? [
                {
                  label: "Top up POINTS",
                  onClick: () => {
                    router.push(`/store?returnTo=/series/${seriesId}&focus=auto`);
                    track("offer_click", {
                      offerId: "store_entry",
                      entry: "UNLOCK_MODAL",
                    });
                    setModalState(null);
                  },
                  variant: "secondary",
                },
                {
                  label: "Subscribe for perks",
                  onClick: () => {
                    track("click_subscribe_from_shortfall", {
                      seriesId,
                      episodeId: episode?.id,
                    });
                    router.push(`/subscribe?returnTo=/series/${seriesId}`);
                    setModalState(null);
                  },
                  variant: "secondary",
                },
                {
                  label: recommendedTopup?.name
                    ? `Quick top up (${recommendedTopup.name})`
                    : "Quick top up",
                  onClick: async () => {
                    const packageId =
                      recommendedTopup?.id?.replace("points_pack_", "") ||
                      "starter";
                    track("topup_start", { packageId, entry: "UNLOCK_MODAL" });
                    track("offer_click", {
                      offerId: recommendedTopup?.id || "points_pack_starter",
                      entry: "UNLOCK_MODAL",
                    });
                    const topupResponse = await topup(packageId);
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
                        recordUnlock(seriesId, episode?.id);
                        track("offer_purchase_success", {
                          offerId: recommendedTopup?.id || "points_pack_starter",
                          entry: "UNLOCK_MODAL",
                          orderId: topupResponse.data?.order?.orderId,
                        });
                        track("topup_success", {
                          packageId,
                          orderId: topupResponse.data?.order?.orderId,
                        });
                        setModalState({
                          type: "SUCCESS",
                          title: "Unlocked",
                          description: "Episode unlocked successfully.",
                        });
                        return;
                      }
                    }
                    track("topup_fail", {
                      packageId,
                      status: topupResponse.status,
                      errorCode: topupResponse.error,
                      requestId: topupResponse.requestId,
                    });
                    track("unlock_fail", {
                      seriesId,
                      episodeId: episode?.id,
                      retry: true,
                      errorCode: retry?.error,
                      requestId: retry?.requestId,
                    });
                    setModalState({
                      type: "ERROR",
                      title: "Top up failed",
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

const MemoEpisodeRow = memo(EpisodeRow, (prev, next) => {
  if (prev.nowMs !== next.nowMs) {
    return false;
  }
  if (prev.unlocked !== next.unlocked) {
    return false;
  }
  if (prev.pricePts !== next.pricePts) {
    return false;
  }
  if (prev.seriesId !== next.seriesId) {
    return false;
  }
  if (prev.episode?.id !== next.episode?.id) {
    return false;
  }
  if (prev.episode?.ttfReadyAt !== next.episode?.ttfReadyAt) {
    return false;
  }
  if (prev.episode?.title !== next.episode?.title) {
    return false;
  }
  if (prev.episode?.releasedAt !== next.episode?.releasedAt) {
    return false;
  }
  if (prev.ttfStatus?.eligible !== next.ttfStatus?.eligible) {
    return false;
  }
  return true;
});

MemoEpisodeRow.displayName = "EpisodeRow";

export default MemoEpisodeRow;
