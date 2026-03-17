"use client";

import useCountdown from "../../hooks/useCountdown";
import { OFFERS } from "../../lib/offers/catalog";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import ShareButton from "../common/ShareButton";

function formatPointsLabel(value) {
  return `${Number(value || 0)} points`;
}

function formatPackLabel(value) {
  const count = Number(value || 0);
  return `${count || 1} more episode${count === 1 ? "" : "s"}`;
}

function DiscoveryContextCard({ discoveryContext, onReturnToSource }) {
  if (!discoveryContext) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/85">
            Opened from
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {discoveryContext.sourceLabel} | {discoveryContext.laneValue}
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-400">
            {discoveryContext.returnHint}
          </p>
        </div>
        {onReturnToSource ? (
          <button
            type="button"
            onClick={onReturnToSource}
            className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-100"
          >
            {discoveryContext.returnLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MetaPill({ children, accent = false }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        accent
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          : "border-white/10 bg-white/[0.04] text-neutral-200"
      }`}
    >
      {children}
    </span>
  );
}

export default function EndOfEpisodeOverlay({
  open,
  nextEpisode,
  nextUnlocked,
  decision,
  pricing,
  packPricing,
  walletBalance = 0,
  isSubscriber = false,
  onNext,
  onUnlock,
  onSubscribe,
  onClaim,
  onNotify,
  onOfferClick,
  onPackOffer,
  onOpenStore,
  onViewSeries,
  onOpenSupport,
  discoveryContext = null,
  seriesTitle,
  episodeTitle,
  primaryActionRef,
  highlightPrimaryAction = false,
  onReturnToSource,
}) {
  const readyAtMs = nextEpisode?.ttfReadyAt ? Date.parse(nextEpisode.ttfReadyAt) : null;
  const { isReady, formatted } = useCountdown(readyAtMs);

  if (!open || !nextEpisode) {
    return null;
  }

  const showTtf = Boolean(nextEpisode.ttfEligible);
  const recommendedId = decision?.recommendedUnlockOfferId || "unlock_single";
  const recommendedOffer = OFFERS[recommendedId];
  const showSubscribe = decision?.showSubscribeUpsell;
  const countdownVariant = decision?.countdownVariant || "A";
  const packHintVariant = decision?.packHintVariant || "A";
  const packOfferId =
    recommendedOffer?.episodes && recommendedOffer.episodes > 1
      ? recommendedId
      : "unlock_pack_3";
  const packOffer = OFFERS[packOfferId];
  const singlePrice = pricing?.finalPrice ?? nextEpisode.pricePts;
  const packPrice = packPricing?.finalPrice || packOffer?.pricePts || 0;
  const showPackPrimary =
    packHintVariant === "C" || (recommendedOffer?.episodes || 0) > 1;
  const primaryLabel = showPackPrimary
    ? `Unlock ${formatPackLabel(packOffer?.episodes || 3)} (${formatPointsLabel(packPrice)})`
    : singlePrice === 0
      ? "Unlock next episode free"
      : `Unlock next episode (${formatPointsLabel(singlePrice)})`;
  const secondaryLabel = showPackPrimary
    ? `Single episode (${formatPointsLabel(singlePrice)})`
    : `${formatPackLabel(packOffer?.episodes || 3)} (${formatPointsLabel(packPrice)})`;
  const packSavingsText = packOffer?.savingsPct ? `Save ${packOffer.savingsPct}%` : "";
  const pricingNote = pricing?.appliedDailyFree
    ? "Daily free unlock available"
    : pricing?.appliedCoupon?.label ||
      (pricing?.discountPct ? `Subscriber ${pricing.discountPct}% off` : "");
  const packNote =
    packPricing?.appliedCoupon?.label ||
    (packPricing?.discountPct ? `Subscriber ${packPricing.discountPct}% off` : "");
  const subscriptionNote =
    "Membership adds daily free unlocks, shorter wait timers, and better bundle value.";
  const upsellBadge = showSubscribe ? "Recommended" : "";
  const nextEpisodeStatusLabel = nextUnlocked
    ? "Ready to read now"
    : showTtf && isReady
      ? "Free unlock ready"
      : showTtf && !isReady
        ? `Free unlock in ${formatted || "--:--:--"}`
        : singlePrice === 0
          ? "Free"
          : formatPointsLabel(singlePrice);

  const handlePrimary = () => {
    const primaryId = showPackPrimary ? packOfferId : "unlock_single";
    onOfferClick?.(primaryId);
    if (showPackPrimary) {
      onPackOffer?.(packOffer);
      return;
    }
    onUnlock();
  };

  const handleSecondary = () => {
    const offerId = showPackPrimary ? "unlock_single" : packOfferId;
    onOfferClick?.(offerId);
    if (showPackPrimary) {
      onUnlock();
      return;
    }
    onPackOffer?.(packOffer);
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
      <div className="w-full max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-900/95 p-5 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-400">{STOREFRONT_TERMS.readingDesk}</p>
            <p className="text-lg font-semibold text-white">{nextEpisode.title}</p>
            {seriesTitle ? (
              <p className="mt-1 text-xs text-neutral-500">{seriesTitle}</p>
            ) : null}
          </div>
          <ShareButton
            url={typeof window !== "undefined" ? window.location.href : ""}
            title={`${seriesTitle || "Series"} - ${episodeTitle || "Episode"}`}
            description="I just finished reading this episode! Check it out."
            className=""
          />
        </div>

        <div className="mt-4 space-y-4">
          <DiscoveryContextCard
            discoveryContext={discoveryContext}
            onReturnToSource={onReturnToSource}
          />

          {nextUnlocked ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/85">
                    Next up
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{nextEpisode.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetaPill accent>{nextEpisodeStatusLabel}</MetaPill>
                    <MetaPill>
                      {isSubscriber ? "Member perks active" : "Keep reading"}
                    </MetaPill>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    ref={primaryActionRef}
                    type="button"
                    onClick={onNext}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      highlightPrimaryAction
                        ? "border-emerald-300/60 bg-emerald-400/14 text-emerald-50 shadow-[0_0_0_1px_rgba(110,231,183,0.26),0_20px_50px_rgba(16,185,129,0.2)] motion-safe:animate-pulse"
                        : "border-white bg-white text-neutral-900 hover:bg-neutral-200"
                    }`}
                  >
                    Read next
                  </button>
                  {onViewSeries ? (
                    <button
                      type="button"
                      onClick={onViewSeries}
                      className="rounded-full border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200"
                    >
                      View series
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-4">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/85">
                    Next unlock
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{nextEpisode.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetaPill accent>{nextEpisodeStatusLabel}</MetaPill>
                    <MetaPill>{formatPointsLabel(walletBalance)}</MetaPill>
                    <MetaPill>{isSubscriber ? "Member mode" : "Points mode"}</MetaPill>
                    {pricingNote ? <MetaPill>{pricingNote}</MetaPill> : null}
                  </div>

                  {showTtf ? (
                    isReady ? (
                      <button
                        type="button"
                        onClick={onClaim}
                        className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
                      >
                        Unlock free
                      </button>
                    ) : (
                      <div
                        className={`mt-4 ${
                          countdownVariant === "B"
                            ? "flex flex-col gap-2 rounded-2xl border border-neutral-800 bg-black/20 px-4 py-3 text-xs text-neutral-200"
                            : "flex flex-wrap items-center gap-3 rounded-full border border-neutral-800 px-4 py-2 text-xs text-neutral-300"
                        }`}
                      >
                        <span>Free unlock in {formatted || "--:--:--"}</span>
                        <button
                          type="button"
                          onClick={() => onNotify?.()}
                          className="rounded-full border border-neutral-700 px-3 py-1 text-[10px] font-semibold text-neutral-100"
                        >
                          Remind me
                        </button>
                      </div>
                    )
                  ) : null}
                </div>

                <div className="w-full max-w-sm space-y-2">
                  <button
                    ref={primaryActionRef}
                    type="button"
                    onClick={handlePrimary}
                    className={`w-full rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      highlightPrimaryAction
                        ? "border-emerald-300/60 bg-emerald-400/14 text-emerald-50 shadow-[0_0_0_1px_rgba(110,231,183,0.26),0_20px_50px_rgba(16,185,129,0.2)] motion-safe:animate-pulse"
                        : "border-white bg-white text-neutral-900 hover:bg-neutral-200"
                    }`}
                  >
                    {primaryLabel}
                  </button>

                  {showPackPrimary && packSavingsText ? (
                    <p className="text-xs text-emerald-300">{packSavingsText}</p>
                  ) : null}

                  {showSubscribe ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onOfferClick?.("subscribe_basic");
                          onSubscribe();
                        }}
                        className="w-full rounded-full border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-100"
                      >
                        {STOREFRONT_TERMS.compareMembership}
                        {upsellBadge ? (
                          <span className="ml-2 text-[10px] text-emerald-300">{upsellBadge}</span>
                        ) : null}
                      </button>
                      <p className="text-xs text-neutral-400">{subscriptionNote}</p>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleSecondary}
                        className="w-full rounded-full border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-100"
                      >
                        {secondaryLabel}
                      </button>
                      {packNote ? (
                        <p className="text-xs text-neutral-400">{packNote}</p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!nextUnlocked && onViewSeries ? (
              <button
                type="button"
                onClick={onViewSeries}
                className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-200"
              >
                View series
              </button>
            ) : null}
            {onOpenStore ? (
              <button
                type="button"
                onClick={onOpenStore}
                className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-200"
              >
                {STOREFRONT_TERMS.viewPointPacks}
              </button>
            ) : null}
            {onOpenSupport ? (
              <button
                type="button"
                onClick={onOpenSupport}
                className="rounded-full border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-400"
              >
                Billing help
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
