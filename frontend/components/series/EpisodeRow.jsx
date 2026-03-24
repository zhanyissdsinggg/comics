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
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import { getEpisodeAccessState } from "../../lib/episodeAccessState";

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

function formatPointsLabel(value) {
  return `${Number(value || 0)} points`;
}

function formatPackLabel(value) {
  const count = Number(value || 0);
  return `${count || 1}-episode pack`;
}

function getSignalClass(tone) {
  if (tone === "free" || tone === "ready" || tone === "membership") {
    return "border-[rgba(49,87,214,0.14)] bg-[rgba(49,87,214,0.06)] text-[var(--gush-accent,#3157d6)]";
  }
  if (tone === "preview") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (tone === "points") {
    return "border-black/10 bg-white text-slate-700";
  }
  if (tone === "locked") {
    return "border-black/8 bg-[#f8f9fc] text-slate-500";
  }

  return "border-black/8 bg-[#f8f9fc] text-slate-500";
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
  const now = typeof nowMs === "number" ? nowMs : Date.now();

  const isSubscriber = Boolean(subscription?.active);
  const walletBalance = (paidPts || 0) + (bonusPts || 0);
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
    ],
  );

  const recommendedTopup = offerDecision.recommendedTopupOffer;
  const recommendedUnlockOffer = offerDecision.recommendedUnlockOffer;
  const offerBadge = recommendedUnlockOffer?.tag;
  const savingsText = recommendedUnlockOffer?.savingsPct
    ? `You save ${recommendedUnlockOffer.savingsPct}%`
    : null;
  const accessState = useMemo(
    () =>
      getEpisodeAccessState({
        episode: {
          ...episode,
          ttfEligible: ttfStatus?.eligible,
          ttfReadyAt: ttfStatus?.readyAt,
        },
        unlocked,
        subscription,
        subscriptionUsage,
        coupons,
        nowMs: now,
        fallbackPrice: pricePts,
      }),
    [coupons, episode, now, pricePts, subscription, subscriptionUsage, ttfStatus?.eligible, ttfStatus?.readyAt, unlocked],
  );
  const effectivePrice = accessState.effectivePrice;
  const episodeDisplayTitle =
    episode?.title && !/^(Episode|Ep\.?)\s*\d+$/i.test(episode.title)
      ? ["Ep ", episode?.number, " - ", episode.title].join("")
      : `Episode ${episode?.number}`;
  const shortfallValue = effectivePrice > 0 ? Math.max(0, effectivePrice - walletBalance) : 0;
  const progressMetaLabel =
    progress?.lastEpisodeId === episode?.id && progress?.percent && progress.percent > 0
      ? `${Math.round(progress.percent * 100)}% read`
      : "";
  const sideLabel =
    progress?.lastEpisodeId === episode?.id && progress?.percent && progress.percent > 0
      ? `${Math.round(progress.percent * 100)}% read`
      : accessState.shortLabel;
  const rowHelperText = accessState.rowHelperText || "";
  const supportDetail =
    progressMetaLabel
      ? ""
      : accessState.kind === "preview"
        ? accessState.supportLabel || ""
        : accessState.kind === "points"
          ? accessState.supportLabel ||
            (shortfallValue > 0 ? `Need ${shortfallValue} more points` : "")
          : accessState.kind === "membership"
            ? accessState.supportLabel || ""
            : "";
  const compareItems =
    modalState?.type === "SHORTFALL" && recommendedUnlockOffer?.episodes > 1
      ? [
          { label: "Single episode", value: formatPointsLabel(pricePts) },
          {
            label: formatPackLabel(recommendedUnlockOffer.episodes),
            value: formatPointsLabel(recommendedUnlockOffer.pricePts),
          },
          {
            label: "Membership",
            value: isSubscriber ? "Already active" : "Free unlocks + lower prices",
          },
        ]
      : [];
  const unlockTips =
    modalState?.type === "SHORTFALL"
      ? [
          "Unlocked episodes stay in your library.",
          "Packs usually cost less per chapter.",
          "Membership adds more free reads and shorter waits.",
        ]
      : [];
  const subscribeUpsellTips =
    modalState?.type === "SHORTFALL"
      ? [
          "Member pricing can lower unlock costs on eligible titles.",
          "Membership can speed up free unlock timers.",
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

  const handleClaimAccess = async () => {
    setIsWorking(true);
    trackEvent("ttf_claim", { seriesId, episodeId: episode?.id });
    let response;
    try {
      response = await onClaim(seriesId, episode?.id);
    } catch {
      response = { ok: false, status: 500, error: "CLAIM_FAILED" };
    }
    if (response.ok) {
      trackEvent("ttf_claim_success", { seriesId, episodeId: episode?.id });
      setModalState({
        type: "SUCCESS",
        title: "Episode unlocked",
        description: "You're all set. Start reading.",
      });
      setIsWorking(false);
      return;
    }

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
    setModalState({
      type: "ERROR",
      title: "Free read unavailable",
      description:
        response.status === 409
          ? "That free read is not ready yet."
          : response.error || "We couldn't open that free read right now.",
    });
    setIsWorking(false);
  };

  const handleUnlockAccess = async () => {
    setIsWorking(true);
    trackEvent("click_unlock", { seriesId, episodeId: episode?.id });
    const idempotencyKey = createIdempotencyKey();
    let response;
    try {
      response = await onUnlock(seriesId, episode?.id, idempotencyKey);
    } catch {
      response = { ok: false, status: 500, error: "UNLOCK_FAILED" };
    }

    if (response.ok) {
      trackEvent("unlock_success", { seriesId, episodeId: episode?.id });
      recordUnlock(seriesId, episode?.id);
      setModalState({
        type: "SUCCESS",
        title: "Episode unlocked",
        description: "You're all set. Start reading.",
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
        description: "Sign in to unlock this episode and keep your place.",
      });
    } else if (response.status === 402) {
      setModalState({
        type: "SHORTFALL",
        title: "Need more points",
        description: "Add points or check membership to keep reading.",
        shortfallPts: response.shortfallPts || 0,
        offerId: recommendedTopup?.id,
      });
    } else {
      setModalState({
        type: "ERROR",
        title: "Couldn't unlock",
        description: response.error || "Please try again in a moment.",
      });
    }
    setIsWorking(false);
  };

  const handlePrimaryAction = async () => {
    if (isWorking) {
      return;
    }

    if (accessState.actionKind === "read" || accessState.actionKind === "preview") {
      onRead(seriesId, episode?.id);
      return;
    }

    if (accessState.actionKind === "claim") {
      await handleClaimAccess();
      return;
    }

    if (accessState.actionKind === "unlock") {
      await handleUnlockAccess();
      return;
    }

    onSubscribe(seriesId, episode?.id);
  };

  const actionClassName =
    accessState.actionKind === "claim" || accessState.actionKind === "read" || accessState.actionKind === "preview"
      ? "min-h-[44px] w-full rounded-full bg-[var(--gush-accent,#3157d6)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--gush-accent-strong,#2444af)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[172px]"
        : accessState.actionKind === "subscribe"
        ? "min-h-[44px] w-full rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[172px]"
        : "min-h-[44px] w-full rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-95 active:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[172px]";

  const actionNode = (
    <button
      type="button"
      onClick={handlePrimaryAction}
      disabled={isWorking}
      className={actionClassName}
      style={{ willChange: "transform" }}
    >
      {accessState.actionLabel}
    </button>
  );
  const showStateBadge =
    accessState.kind !== "unlocked" && accessState.primaryState !== "free";

  return (
    <li
      id={`episode-${episode?.id}`}
      className="group overflow-hidden rounded-[22px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,246,242,0.94))] p-3 shadow-[0_12px_28px_rgba(15,23,42,0.045)] transition-all duration-300 hover:-translate-y-0.5 hover:border-black/10"
    >
      <div className="grid gap-3 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
        <div className="relative h-24 overflow-hidden rounded-[18px] border border-black/8 bg-[rgba(246,243,237,0.92)] shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:h-[104px]">
          {episode?.thumbnailUrl || episode?.pages?.[0]?.url ? (
            <Image
              src={episode?.thumbnailUrl || episode?.pages?.[0]?.url}
              alt={`Episode ${episode?.number} thumbnail`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 76px, 96px"
              loading="lazy"
            />
          ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f4f1eb_0%,#ebe7df_100%)] text-slate-400">
                <span className="text-lg font-semibold tracking-tight">Ep {episode?.number}</span>
              </div>
          )}
        </div>

        <div className="min-w-0">
          <span className="sr-only">
            {episode?.title && !/^(Episode|Ep\.?)\s*\d+$/i.test(episode.title)
              ? `Episode ${episode?.number} - ${episode.title}`
              : `Episode ${episode?.number}`}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-base font-semibold tracking-tight text-slate-950">
              {episodeDisplayTitle}
            </strong>
            {showStateBadge ? (
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getSignalClass(accessState.stateTone)}`}
              >
                {accessState.stateLabel}
              </span>
            ) : null}
            {progress?.lastEpisodeId === episode?.id ? (
              <Pill appearance="light" tone="subtle">
                Last read
              </Pill>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{formatDate(episode?.releasedAt)}</span>
            {progressMetaLabel ? <span>{progressMetaLabel}</span> : null}
          </div>

          {supportDetail && supportDetail !== rowHelperText ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">{supportDetail}</p>
          ) : null}

          {progress?.lastEpisodeId === episode?.id ? (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/6">
              <div
                className="h-full rounded-full bg-[var(--gush-accent,#3157d6)]"
                style={{ width: `${Math.round((progress.percent || 0) * 100)}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:min-w-[172px] sm:items-end">
          {sideLabel ? (
            <p className="text-xs font-medium text-slate-500 sm:text-right">
              {sideLabel}
            </p>
          ) : null}
          {actionNode}
        </div>
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
        compareTitle="Single, pack, or membership"
        tips={[...unlockTips, ...subscribeUpsellTips]}
        tipsTitle="What each option gets you"
        actions={
          modalState?.type === "SHORTFALL"
            ? [
                {
                  label: STOREFRONT_TERMS.viewPointPacks,
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
                        { focus: "auto" },
                      ),
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
                  label: STOREFRONT_TERMS.compareMembership,
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
                      }),
                    );
                    setModalState(null);
                  },
                  variant: "secondary",
                },
                {
                  label: recommendedTopup?.name
                    ? `Get ${recommendedTopup.name}`
                    : "Get recommended pack",
                  onClick: async () => {
                    const packageId =
                      recommendedTopup?.id?.replace("points_pack_", "") || "starter";
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
                      } catch {
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
                          description: "You're all set. Start reading.",
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
                      title: "Couldn't add points",
                      description: "We couldn't finish that purchase just now.",
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
