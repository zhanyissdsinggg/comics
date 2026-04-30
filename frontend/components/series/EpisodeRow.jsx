"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ActionModal from "./ActionModal";
import UnlockChapterModal from "./UnlockChapterModal";
import { useWalletStore } from "../../store/useWalletStore";
import { trackEvent } from "../../lib/trackEvent";
import { decideOffers } from "../../lib/offers/decide";
import {
  getBucket,
  getOrCreateUserId,
  trackExposure,
} from "../../lib/experiments/ab";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { getEpisodeAccessState } from "../../lib/episodeAccessState";
import { buildReaderPath } from "../../lib/readerRoutes";
import {
  formatInstallmentLabel,
  isDefaultInstallmentTitle,
} from "../../lib/seriesFormatLabels";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

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

function getSignalClass(tone) {
  if (tone === "free" || tone === "ready" || tone === "membership") {
    return "border-2 border-black bg-[#00E5FF] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]";
  }
  if (tone === "preview") {
    return "border-2 border-black bg-[#FFE500] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]";
  }
  if (tone === "points") {
    return "border-2 border-black bg-[#FFE500] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]";
  }
  if (tone === "locked") {
    return "border-2 border-white/20 bg-black text-white/70 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]";
  }

  return "border-2 border-white/20 bg-black text-white/70 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]";
}

function EpisodeRow({
  episode,
  seriesId,
  seriesType,
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
  const { paidPts, bonusPts, subscription, subscriptionUsage } =
    useWalletStore();
  const { isSignedIn } = useAuthStore();
  const { isAdultMode } = useAdultGateStore();
  const { unlockEpisode: recordUnlock } = useBehaviorStore();
  const [modalState, setModalState] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const impressionRef = useRef(false);
  const now = typeof nowMs === "number" ? nowMs : Date.now();

  const isSubscriber = Boolean(subscription?.active);
  const walletBalance = (paidPts || 0) + (bonusPts || 0);
  const isWorking = Boolean(busyAction);
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
    [
      coupons,
      episode,
      now,
      pricePts,
      subscription,
      subscriptionUsage,
      ttfStatus?.eligible,
      ttfStatus?.readyAt,
      unlocked,
    ],
  );
  const effectivePrice = accessState.effectivePrice;
  const hasCustomEpisodeTitle =
    Boolean(episode?.title) &&
    !isDefaultInstallmentTitle(episode.title, {
      ...episode,
      type: seriesType || episode?.type,
    });
  const episodeNumberLabel = formatInstallmentLabel(
    {
      ...episode,
      type: seriesType || episode?.type,
    },
    episode?.number,
  );
  const episodeHeading = hasCustomEpisodeTitle
    ? episode.title
    : episodeNumberLabel;
  const shortfallValue =
    effectivePrice > 0 ? Math.max(0, effectivePrice - walletBalance) : 0;
  const progressMetaLabel =
    progress?.lastEpisodeId === episode?.id &&
    progress?.percent &&
    progress.percent > 0
      ? `${Math.round(progress.percent * 100)}% read`
      : "";
  const sideLabel =
    progress?.lastEpisodeId === episode?.id &&
    progress?.percent &&
    progress.percent > 0
      ? `${Math.round(progress.percent * 100)}% read`
      : accessState.shortLabel;
  const rowHelperText = accessState.rowHelperText || "";
  const supportDetail = progressMetaLabel
    ? ""
    : accessState.kind === "preview"
      ? accessState.supportLabel || ""
      : accessState.kind === "points"
        ? accessState.supportLabel ||
          (shortfallValue > 0 ? `${shortfallValue} more points` : "")
        : accessState.kind === "membership"
          ? accessState.supportLabel || ""
          : "";
  const isLastReadEpisode = progress?.lastEpisodeId === episode?.id;
  const helperLabel =
    isLastReadEpisode && progressMetaLabel ? progressMetaLabel : supportDetail;

  useEffect(() => {
    if (modalState?.type !== "UNLOCK" || modalState?.view !== "packs") {
      impressionRef.current = false;
      return;
    }
    if (impressionRef.current) {
      return;
    }
    if (recommendedTopup?.id) {
      trackEvent("offer_impression", {
        offerId: recommendedTopup.id,
        entry: "UNLOCK_MODAL",
      });
      impressionRef.current = true;
    }
  }, [modalState?.type, modalState?.view, recommendedTopup?.id]);

  const handleClaimAccess = async () => {
    setBusyAction("claim");
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
        title: "Unlocked",
        description: "",
      });
      setBusyAction("");
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
          ? "That free read isn't ready yet."
          : response.error || "Couldn't open it.",
    });
    setBusyAction("");
  };

  const openUnlockModal = (
    view = "confirm",
    nextShortfall = shortfallValue,
  ) => {
    setModalState({
      type: "UNLOCK",
      view,
      installmentNumber: episode?.number,
      seriesType,
      pricePts: effectivePrice,
      shortfallPts: Math.max(0, Number(nextShortfall || 0)),
      targetEpisodeId: episode?.id,
    });
  };

  const handleUnlockAccess = async () => {
    if (!isSignedIn) {
      openAuthModal();
      setModalState(null);
      return;
    }

    setBusyAction("unlock");
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
        title: "Unlocked",
        description: "",
      });
      setBusyAction("");
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
        description: "Sign in to open it.",
      });
    } else if (response.status === 402) {
      openUnlockModal(
        "packs",
        response.shortfallPts || Math.max(0, effectivePrice - walletBalance),
      );
    } else {
      setModalState({
        type: "ERROR",
        title: "Couldn't unlock",
        description: response.error || "Try again in a sec.",
      });
    }
    setBusyAction("");
  };

  const handlePrimaryAction = async () => {
    if (isWorking) {
      return;
    }

  if (
    accessState.actionKind === "read" ||
    accessState.actionKind === "preview"
  ) {
      onRead(seriesId, episode?.id);
      return;
    }

    if (accessState.actionKind === "claim") {
      await handleClaimAccess();
      return;
    }

    if (accessState.actionKind === "unlock") {
      openUnlockModal();
      return;
  }

  if (accessState.actionKind === "locked") {
    return;
  }

  onSubscribe(seriesId, episode?.id);
};

  const actionClassName =
    accessState.actionKind === "claim" ||
    accessState.actionKind === "read" ||
    accessState.actionKind === "preview"
      ? `min-h-[46px] w-full px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[172px] ${storefrontPrimaryButtonClass}`
      : accessState.actionKind === "locked"
        ? `min-h-[46px] w-full px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[172px] ${storefrontSecondaryButtonClass}`
      : accessState.actionKind === "subscribe"
        ? `min-h-[46px] w-full px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[172px] ${storefrontSecondaryButtonClass}`
        : `min-h-[46px] w-full px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[172px] ${storefrontSecondaryButtonClass}`;
  const readHref = buildReaderPath(seriesId, episode?.id);
  const isDirectReadLink =
    accessState.actionKind === "read" || accessState.actionKind === "preview";

  const actionNode = isDirectReadLink ? (
    <Link
      href={readHref}
      onClick={() => onRead(seriesId, episode?.id)}
      className={`inline-flex items-center justify-center ${actionClassName}`}
      style={{ willChange: "transform" }}
    >
      {accessState.actionLabel}
    </Link>
  ) : (
    <button
      type="button"
      onClick={handlePrimaryAction}
      disabled={isWorking || accessState.actionKind === "locked"}
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
      className="group overflow-hidden rounded-[28px] border-2 border-white/15 bg-[#0a0a0a] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 hover:border-[#00E5FF]"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="min-w-0 w-full">
          {hasCustomEpisodeTitle ? (
            <>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
                  {episodeNumberLabel}
                </span>
                {showStateBadge ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${getSignalClass(accessState.stateTone)}`}
                  >
                    {accessState.stateLabel}
                  </span>
                ) : null}
                {isLastReadEpisode ? (
                  <span className="rounded-full border-2 border-black bg-[#FFE500] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    Last read
                  </span>
                ) : null}
              </div>
              <strong className="mt-2 block text-[1.02rem] font-black uppercase tracking-[-0.02em] text-white">
                {episodeHeading}
              </strong>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <strong className="text-[1.02rem] font-black uppercase tracking-[-0.02em] text-white">
                {episodeHeading}
              </strong>
              {showStateBadge ? (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${getSignalClass(accessState.stateTone)}`}
                >
                  {accessState.stateLabel}
                </span>
              ) : null}
              {isLastReadEpisode ? (
                <span className="rounded-full border-2 border-black bg-[#FFE500] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  Last read
                </span>
              ) : null}
            </div>
          )}

          {helperLabel && helperLabel !== rowHelperText ? (
            <p className="mt-3 text-sm font-semibold leading-6 text-white/80">
              {helperLabel}
            </p>
          ) : null}

          {isLastReadEpisode ? (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#111111]">
              <div
                className="h-full rounded-full bg-[#00E5FF]"
                style={{
                  width: `${Math.round((progress.percent || 0) * 100)}%`,
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="flex w-full max-w-[240px] flex-col items-center gap-2">
          {sideLabel ? (
            <p className="rounded-full border-2 border-white/20 bg-black px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/70 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              {sideLabel}
            </p>
          ) : null}
          {actionNode}
        </div>
      </div>

      <UnlockChapterModal
        open={modalState?.type === "UNLOCK"}
        installmentNumber={modalState?.installmentNumber}
        seriesType={modalState?.seriesType || seriesType}
        pricePts={modalState?.pricePts}
        walletBalance={walletBalance}
        shortfallPts={modalState?.shortfallPts}
        isSignedIn={isSignedIn}
        view={modalState?.view}
        busyAction={busyAction}
        preferredPackageId={recommendedTopup?.id}
        onViewChange={(nextView) =>
          setModalState((current) =>
            current?.type === "UNLOCK"
              ? {
                  ...current,
                  view: nextView,
                }
              : current,
          )
        }
        onConfirmUnlock={handleUnlockAccess}
        onBuyPack={async (packageId) => {
          setBusyAction(`topup:${packageId}`);
          trackEvent("offer_click", {
            offerId: `points_pack_${packageId}`,
            entry: "UNLOCK_MODAL",
          });
          const topupResponse = await topup(packageId, {
            attribution: {
              entryPoint: "UNLOCK_MODAL",
              offerId: `points_pack_${packageId}`,
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
              retry = { ok: false, status: 500, error: "UNLOCK_FAILED" };
            }

            if (retry.ok) {
              trackEvent("unlock_success", {
                seriesId,
                episodeId: episode?.id,
                retry: true,
              });
              recordUnlock(seriesId, episode?.id);
              trackEvent("offer_purchase_success", {
                offerId: `points_pack_${packageId}`,
                entry: "UNLOCK_MODAL",
                orderId: topupResponse.data?.order?.orderId,
              });
              trackEvent("topup_success", {
                packageId,
                orderId: topupResponse.data?.order?.orderId,
              });
              setModalState({
                type: "SUCCESS",
                title: "Unlocked",
                description: "",
              });
              setBusyAction("");
              return;
            }

            if (retry.status === 402) {
              openUnlockModal(
                "packs",
                retry.shortfallPts ||
                  Math.max(
                    0,
                    effectivePrice - ((paidPts || 0) + (bonusPts || 0)),
                  ),
              );
              setBusyAction("");
              return;
            }

            trackEvent("unlock_fail", {
              seriesId,
              episodeId: episode?.id,
              retry: true,
              status: retry.status,
              errorCode: retry.error,
              requestId: retry.requestId,
            });
          } else {
            trackEvent("topup_fail", {
              packageId,
              status: topupResponse.status,
              errorCode: topupResponse.error,
              requestId: topupResponse.requestId,
            });
          }

          setModalState({
            type: "ERROR",
            title: "Couldn't add points",
            description: "Couldn't finish checkout.",
          });
          setBusyAction("");
        }}
        onOpenStore={() => {
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
        }}
        onClose={() => {
          if (!busyAction) {
            setModalState(null);
          }
        }}
      />

      <ActionModal
        open={Boolean(modalState) && modalState?.type !== "UNLOCK"}
        type={modalState?.type}
        title={modalState?.title}
        description={modalState?.description}
        shortfallPts={modalState?.shortfallPts}
        offer={modalState?.type === "SHORTFALL" ? recommendedTopup : null}
        offerBadge={
          modalState?.type === "SHORTFALL" ? recommendedTopup?.tag : null
        }
        offerSavingsText={null}
        compareItems={[]}
        tips={[]}
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
  if (prev.episode?.access?.ttfReadyAt !== next.episode?.access?.ttfReadyAt) {
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
