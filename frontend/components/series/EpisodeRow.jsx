"use client";

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
    timeZone: "UTC",
  }).format(new Date(parsed));
}

function getSignalClass(tone) {
  if (tone === "free" || tone === "ready" || tone === "membership") {
    return "border-[2px] border-black bg-[#eefcff] text-black";
  }
  if (tone === "preview") {
    return "border-[2px] border-black bg-white text-black";
  }
  if (tone === "points") {
    return "border-[2px] border-black bg-[#fff7cf] text-black";
  }
  if (tone === "locked") {
    return "border-[2px] border-black bg-[#f3f0ea] text-black/55";
  }

  return "border-[2px] border-black bg-[#f3f0ea] text-black/55";
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
    Boolean(episode?.title) && !/^(Episode|Ep\.?)\s*\d+$/i.test(episode.title);
  const episodeNumberLabel = `Episode ${episode?.number}`;
  const episodeDisplayTitle = hasCustomEpisodeTitle
    ? `${episodeNumberLabel} - ${episode.title}`
    : episodeNumberLabel;
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
          (shortfallValue > 0 ? `Need ${shortfallValue} more points` : "")
        : accessState.kind === "membership"
          ? accessState.supportLabel || ""
          : "";

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
        title: "Episode unlocked",
        description: "You're all set. Start reading.",
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
          ? "That free read is not ready yet."
          : response.error || "We couldn't open that free read right now.",
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
      chapterNumber: episode?.number,
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
        title: "Episode unlocked",
        description: "You're all set. Start reading.",
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
        description: "Sign in to unlock this episode and keep your place.",
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
        description: response.error || "Please try again in a moment.",
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

    onSubscribe(seriesId, episode?.id);
  };

  const actionClassName =
    accessState.actionKind === "claim" ||
    accessState.actionKind === "read" ||
    accessState.actionKind === "preview"
      ? "min-h-[46px] w-full rounded-full border-[3px] border-black bg-[#ff007a] px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#e1006d] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[172px]"
      : accessState.actionKind === "subscribe"
        ? "min-h-[46px] w-full rounded-full border-[3px] border-black bg-white px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black transition-all hover:-translate-y-0.5 hover:bg-[#eefcff] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[172px]"
        : "min-h-[46px] w-full rounded-full border-[3px] border-black bg-white px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#ffe500] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[172px]";

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
      className="group overflow-hidden border-[3px] border-black bg-white p-3.5 shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#fffdf7] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
        <div className="min-w-0">
          <span className="sr-only">{episodeDisplayTitle}</span>

          {hasCustomEpisodeTitle ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                  {episodeNumberLabel}
                </span>
                {showStateBadge ? (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getSignalClass(accessState.stateTone)}`}
                  >
                    {accessState.stateLabel}
                  </span>
                ) : null}
                {progress?.lastEpisodeId === episode?.id ? (
                  <span className="rounded-full border-[2px] border-black bg-[#ffe500] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                    Last read
                  </span>
                ) : null}
              </div>
              <strong className="mt-2 block text-[1.02rem] font-black uppercase tracking-[0.01em] text-black">
                {episodeHeading}
              </strong>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-[1.02rem] font-black uppercase tracking-[0.01em] text-black">
                {episodeHeading}
              </strong>
              {showStateBadge ? (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getSignalClass(accessState.stateTone)}`}
                >
                  {accessState.stateLabel}
                </span>
              ) : null}
              {progress?.lastEpisodeId === episode?.id ? (
                <span className="rounded-full border-[2px] border-black bg-[#ffe500] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                  Last read
                </span>
              ) : null}
            </div>
          )}

          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium uppercase tracking-[0.08em] text-black/45">
            <span>{formatDate(episode?.releasedAt)}</span>
            {progressMetaLabel ? <span>{progressMetaLabel}</span> : null}
          </div>

          {supportDetail && supportDetail !== rowHelperText ? (
            <p className="mt-3 text-sm font-semibold leading-6 text-black/68">
              {supportDetail}
            </p>
          ) : null}

          {progress?.lastEpisodeId === episode?.id ? (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--gush-page-bg-muted)]">
              <div
                className="h-full rounded-full bg-[var(--gush-accent,#3157d6)]"
                style={{
                  width: `${Math.round((progress.percent || 0) * 100)}%`,
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:min-w-[172px] sm:items-end">
          {sideLabel ? (
            <p className="border-[2px] border-black bg-[#fff6cf] px-2.5 py-1 text-xs font-black uppercase tracking-[0.08em] text-black/55 sm:text-right">
              {sideLabel}
            </p>
          ) : null}
          {actionNode}
        </div>
      </div>

      <UnlockChapterModal
        open={modalState?.type === "UNLOCK"}
        chapterNumber={modalState?.chapterNumber}
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
                title: "Episode unlocked",
                description: "You're all set. Start reading.",
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
            description: "We couldn't finish that purchase just now.",
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
