"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Pill from "../common/Pill";
import ActionModal from "./ActionModal";
import { useWalletStore } from "../../store/useWalletStore";
import { trackEvent } from "../../lib/trackEvent";
import { decideOffers } from "../../lib/offers/decide";
import { getBucket, getOrCreateUserId, trackExposure } from "../../lib/experiments/ab";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { calculatePrice } from "../../lib/pricing";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";

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

function formatPointsLabel(value) {
  return `${Number(value || 0)} points`;
}

function formatPackLabel(value) {
  const count = Number(value || 0);
  return `${count || 1}-episode pack`;
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
    !unlocked && subscriptionUsage?.remaining ? "Daily free unlock available" : "";
  const compareItems =
    modalState?.type === "SHORTFALL" && recommendedUnlockOffer?.episodes > 1
      ? [
          { label: "Single episode", value: formatPointsLabel(pricePts) },
          {
            label: formatPackLabel(recommendedUnlockOffer.episodes),
            value: formatPointsLabel(recommendedUnlockOffer.pricePts),
          },
        ]
      : [];
  const unlockTips =
    modalState?.type === "SHORTFALL"
      ? [
          "Unlocking keeps this episode in your library.",
          "Episode packs lower your cost per chapter.",
          "Membership adds daily free unlocks and shorter wait timers.",
        ]
      : [];
  const subscribeUpsellTips =
    modalState?.type === "SHORTFALL"
      ? [
          "Member perks can reduce unlock costs on supported titles.",
          "Membership shortens the wait before free unlocks are ready.",
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
      trackEvent("offer_impression", { offerId: recommendedUnlockOffer.id, entry: "UNLOCK_MODAL" });
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
        Read now
      </button>
    );
    if (progress?.lastEpisodeId === episode?.id && progress?.percent && progress.percent > 0) {
      metaNode = (
        <span>{Math.round(progress.percent * 100)}% read</span>
      );
    }
  } else if (ttfStatus?.eligible && isReady) {
    metaNode = <span>Free unlock ready</span>;
    actionNode = (
      <button
        type="button"
        onClick={async () => {
          setIsWorking(true);
          trackEvent("ttf_claim", { seriesId, episodeId: episode?.id });
          let response;
          try {
            response = await onClaim(seriesId, episode?.id);
          } catch (err) {
            response = { ok: false, status: 500, error: "CLAIM_FAILED" };
          }
          if (response.ok) {
            trackEvent("ttf_claim_success", { seriesId, episodeId: episode?.id });
            setModalState({
              type: "SUCCESS",
              title: "Episode unlocked",
              description: "This episode is now unlocked and ready to read.",
            });
          } else {
            trackEvent("ttf_claim_fail", {
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
                ? "The free unlock timer is not ready yet."
                : response.error || "The free unlock could not be claimed.";
            setModalState({
              type: "ERROR",
              title: "Free unlock unavailable",
              description,
            });
          }
          setIsWorking(false);
        }}
        disabled={isWorking}
        className="min-h-[44px] rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:scale-95 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ willChange: "transform" }}
      >
        Unlock free
      </button>
    );
  } else if (ttfStatus?.eligible && !isReady) {
    metaNode = <span>Free unlock in {formatted || "--:--:--"}</span>;
    actionNode = (
      <button
        type="button"
        onClick={() => onSubscribe(seriesId, episode?.id)}
        disabled={isWorking}
        className="min-h-[44px] rounded-full border border-neutral-700 bg-neutral-900 px-6 py-2 text-sm font-semibold text-neutral-300 transition-all hover:border-neutral-600 hover:bg-neutral-800 active:scale-95 active:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ willChange: "transform" }}
      >
        See member perks
      </button>
    );
  } else {
    if (pricing.appliedDailyFree) {
      metaNode = <span>Daily free unlock available</span>;
    } else if (effectivePrice !== pricePts) {
      metaNode = <span>{discountLabel || "Member discount applied"}</span>;
    }
    actionNode = (
      <button
        type="button"
        onClick={async () => {
          setIsWorking(true);
          trackEvent("click_unlock", { seriesId, episodeId: episode?.id });
          const idempotencyKey = createIdempotencyKey();
          let response;
          try {
            response = await onUnlock(seriesId, episode?.id, idempotencyKey);
          } catch (err) {
            response = { ok: false, status: 500, error: "UNLOCK_FAILED" };
          }
          if (response.ok) {
            trackEvent("unlock_success", { seriesId, episodeId: episode?.id });
            recordUnlock(seriesId, episode?.id);
            setModalState({
              type: "SUCCESS",
              title: "Episode unlocked",
              description: "This episode is now in your library.",
            });
            setIsWorking(false);
            return;
          }

          trackEvent("unlock_fail", {
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
              description: "Sign in to unlock this episode and keep your progress synced.",
            });
          } else if (response.status === 402) {
            setModalState({
              type: "SHORTFALL",
              title: "Not enough points",
              description: "Add points or use member perks to keep reading.",
              shortfallPts: response.shortfallPts || 0,
              offerId: recommendedTopup?.id,
            });
          } else {
            setModalState({
              type: "ERROR",
              title: "Unlock failed",
              description: response.error || "Please try again in a moment.",
            });
          }
          setIsWorking(false);
        }}
        disabled={isWorking}
        className="min-h-[44px] rounded-full bg-white px-6 py-2 text-sm font-semibold text-neutral-900 transition-all hover:bg-emerald-50 active:scale-95 active:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ willChange: "transform" }}
      >
        {effectivePrice === 0 ? "Unlock free" : `Unlock (${effectivePrice} points)`}
      </button>
    );
  }

  return (
    <li className="series-episode">
      {/* 老王注释：章节缩略图 - 使用Next.js Image优化加载 */}
      <div className="episode-thumbnail relative">
        {episode?.thumbnailUrl || episode?.pages?.[0]?.url ? (
          <Image
            src={episode?.thumbnailUrl || episode?.pages?.[0]?.url}
            alt={`Episode ${episode?.number} thumbnail`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100px, 120px"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-neutral-600">
            <span className="text-2xl font-bold">Ep {episode?.number}</span>
          </div>
        )}
      </div>
      <div className="episode-info">
        <div className="episode-title">
          <strong>
            {episode?.title && !/^(Episode|Ep\.?)\s*\d+$/i.test(episode.title)
              ? `Ep ${episode?.number} — ${episode.title}`
              : `Episode ${episode?.number}`}
          </strong>
          {unlocked ? <Pill>Unlocked</Pill> : null}
          {ttfStatus?.eligible && isReady ? <Pill>Free to Read</Pill> : null}
          {progress?.lastEpisodeId === episode?.id ? <Pill>Last read</Pill> : null}
        </div>
        <div className="episode-subtitle">
          <span>{formatDate(episode?.releasedAt)}</span>
          {episode?.previewFreePages ? (
            <span>Preview {episode.previewFreePages} pages free</span>
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
                    label: "Buy points",
                  onClick: () => {
                    router.push(
                      buildPathWithAttribution(
                        "/store",
                        {
                          entryPoint: "UNLOCK_MODAL",
                          sourcePath: `/series/${seriesId}`,
                          sourceSeriesId: seriesId,
                          sourceEpisodeId: episode?.id,
                          returnTo: `/series/${seriesId}`,
                        },
                        { focus: "auto" }
                      )
                    );
                    trackEvent("offer_click", {
                      offerId: "store_entry",
                      entry: "UNLOCK_MODAL",
                    });
                    setModalState(null);
                  },
                  variant: "secondary",
                },
                {
                    label: "See member perks",
                  onClick: () => {
                    trackEvent("click_subscribe_from_shortfall", {
                      seriesId,
                      episodeId: episode?.id,
                    });
                    router.push(
                      buildPathWithAttribution("/subscribe", {
                        entryPoint: "UNLOCK_MODAL",
                        sourcePath: `/series/${seriesId}`,
                        sourceSeriesId: seriesId,
                        sourceEpisodeId: episode?.id,
                        returnTo: `/series/${seriesId}`,
                      })
                    );
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
                    trackEvent("offer_click", {
                      offerId: recommendedTopup?.id || "points_pack_starter",
                      entry: "UNLOCK_MODAL",
                    });
                    const topupResponse = await topup(packageId, {
                      attribution: {
                        entryPoint: "UNLOCK_MODAL",
                        offerId: recommendedTopup?.id || `points_pack_${packageId}`,
                        sourcePath: `/series/${seriesId}`,
                        sourceSeriesId: seriesId,
                        sourceEpisodeId: episode?.id,
                        returnTo: `/series/${seriesId}`,
                      },
                    });
                    if (topupResponse.ok) {
                      let retry;
                      try {
                        const retryKey = createIdempotencyKey();
                        retry = await onUnlock(seriesId, episode?.id, retryKey);
                      } catch (err) {
                        retry = { ok: false };
                      }
                      if (retry.ok) {
                        trackEvent("unlock_success", {
                          seriesId,
                          episodeId: episode?.id,
                          retry: true,
                        });
                        recordUnlock(seriesId, episode?.id);
                        trackEvent("offer_purchase_success", {
                          offerId: recommendedTopup?.id || "points_pack_starter",
                          entry: "UNLOCK_MODAL",
                          orderId: topupResponse.data?.order?.orderId,
                        });
                        trackEvent("topup_success", {
                          packageId,
                          orderId: topupResponse.data?.order?.orderId,
                        });
                        setModalState({
                          type: "SUCCESS",
                          title: "Episode unlocked",
                          description: "This episode is now in your library.",
                        });
                        return;
                      }
                    }
                    trackEvent("topup_fail", {
                      packageId,
                      status: topupResponse.status,
                      errorCode: topupResponse.error,
                      requestId: topupResponse.requestId,
                    });
                    trackEvent("unlock_fail", {
                      seriesId,
                      episodeId: episode?.id,
                      retry: true,
                      errorCode: retry?.error,
                      requestId: retry?.requestId,
                    });
                    setModalState({
                      type: "ERROR",
                      title: "Top up failed",
                      description: "We couldn't complete the top-up and unlock flow.",
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
