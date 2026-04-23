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
    <div className="border-[3px] border-black bg-[#fff6c7] px-4 py-3 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#00a6c7]">
            Opened from
          </p>
          <p className="mt-2 text-sm font-black uppercase tracking-[0.02em] text-black">
            {discoveryContext.sourceLabel} / {discoveryContext.laneValue}
          </p>
          <p className="mt-1 text-xs leading-5 text-black/58">
            {discoveryContext.returnHint}
          </p>
        </div>
        {onReturnToSource ? (
          <button
            type="button"
            onClick={onReturnToSource}
            className="border-[3px] border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#00e5ff] hover:shadow-none"
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
      className={`border-[3px] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${
          accent
            ? "border-black bg-[#00e5ff] text-black"
            : "border-black bg-white text-black/64"
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
  const readyAtMs = nextEpisode?.ttfReadyAt
    ? Date.parse(nextEpisode.ttfReadyAt)
    : null;
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
    ? `Unlock ${formatPackLabel(packOffer?.episodes || 3)}`
    : singlePrice === 0
      ? "Read next free"
      : `Unlock next for ${formatPointsLabel(singlePrice)}`;
  const secondaryLabel = showPackPrimary
    ? singlePrice === 0
      ? "Just the next episode"
      : `Just the next episode (${formatPointsLabel(singlePrice)})`
    : `${formatPackLabel(packOffer?.episodes || 3)} (${formatPointsLabel(packPrice)})`;
  const packSavingsText = packOffer?.savingsPct
    ? `Save ${packOffer.savingsPct}% with the pack`
    : "";
  const pricingNote = pricing?.appliedDailyFree
    ? "Free now"
    : pricing?.appliedCoupon?.label ||
      (pricing?.discountPct ? `Member ${pricing.discountPct}% off` : "");
  const packNote =
    packPricing?.appliedCoupon?.label ||
    (packPricing?.discountPct ? `Member ${packPricing.discountPct}% off` : "");
  const subscriptionNote =
    "Members get free unlocks, shorter waits, and better prices.";
  const upsellBadge = showSubscribe ? "Recommended" : "";
  const nextEpisodeStatusLabel = nextUnlocked
    ? "Ready to read now"
    : showTtf && isReady
      ? "Free now"
      : showTtf && !isReady
        ? `Free in ${formatted || "--:--:--"}`
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
  const primaryButtonClass = highlightPrimaryAction
    ? "border-[3px] border-black bg-[#ff007a] text-white shadow-[0_0_0_4px_rgba(255,0,122,0.18),6px_6px_0_0_rgba(0,0,0,1)]"
    : "border-[3px] border-black bg-[#ff007a] text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#e1006d] hover:shadow-none";
  const secondaryButtonClass =
    "border-[3px] border-black bg-white text-black transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:shadow-none";

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
      <div className="w-full max-w-2xl border-[3px] border-black bg-[#f5f1ea] p-5 shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-black/55">
              Next episode
            </p>
            <p className="text-lg font-black uppercase tracking-[-0.03em] text-black">
              {nextEpisode.title}
            </p>
            {seriesTitle ? (
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-black/58">
                {seriesTitle}
              </p>
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
            <div className="border-[3px] border-black bg-white px-4 py-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#00a6c7]">
                    Ready now
                  </p>
                  <h3 className="mt-2 text-xl font-black uppercase tracking-[-0.03em] text-black">
                    {nextEpisode.title}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetaPill accent>{nextEpisodeStatusLabel}</MetaPill>
                    <MetaPill>
                      {isSubscriber
                        ? "Member perks active"
                        : "Ready when you are"}
                    </MetaPill>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    ref={primaryActionRef}
                    type="button"
                    onClick={onNext}
                    className={`px-4 py-2 text-sm font-semibold transition ${primaryButtonClass}`}
                  >
                    Read next
                  </button>
                  {onViewSeries ? (
                    <button
                      type="button"
                      onClick={onViewSeries}
                      className={`px-4 py-2 text-sm font-semibold ${secondaryButtonClass}`}
                    >
                      Open series
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-[3px] border-black bg-white px-4 py-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#00a6c7]">
                    Continue
                  </p>
                  <h3 className="mt-2 text-xl font-black uppercase tracking-[-0.03em] text-black">
                    {nextEpisode.title}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetaPill accent>{nextEpisodeStatusLabel}</MetaPill>
                    <MetaPill>{formatPointsLabel(walletBalance)}</MetaPill>
                    <MetaPill>{isSubscriber ? "Member" : "Points"}</MetaPill>
                    {pricingNote ? <MetaPill>{pricingNote}</MetaPill> : null}
                  </div>

                  {showTtf ? (
                    isReady ? (
                      <button
                        type="button"
                        onClick={onClaim}
                        className="mt-4 border-[3px] border-black bg-[#00e5ff] px-4 py-2 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#00cde4] hover:shadow-none"
                      >
                        Open now
                      </button>
                    ) : (
                      <div
                        className={`mt-4 ${
                          countdownVariant === "B"
                            ? "flex flex-col gap-2 border-[3px] border-black bg-[#fff6c7] px-4 py-3 text-xs font-semibold text-black/66 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                            : "flex flex-wrap items-center gap-3 border-[3px] border-black bg-[#fff6c7] px-4 py-2 text-xs font-semibold text-black/66 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                        }`}
                      >
                        <span>Free in {formatted || "--:--:--"}</span>
                        <button
                          type="button"
                          onClick={() => onNotify?.()}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${secondaryButtonClass}`}
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
                    className={`w-full px-4 py-2 text-sm font-semibold transition ${primaryButtonClass}`}
                  >
                    {primaryLabel}
                  </button>

                  {showPackPrimary && packSavingsText ? (
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-[#00a6c7]">
                      {packSavingsText}
                    </p>
                  ) : null}

                  {showSubscribe ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onOfferClick?.("subscribe_basic");
                          onSubscribe();
                        }}
                        className={`w-full px-4 py-2 text-sm font-semibold ${secondaryButtonClass}`}
                      >
                        {STOREFRONT_TERMS.compareMembership}
                        {upsellBadge ? (
                          <span className="ml-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#00a6c7]">
                            {upsellBadge}
                          </span>
                        ) : null}
                      </button>
                      <p className="text-xs font-medium leading-5 text-black/58">
                        {subscriptionNote}
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleSecondary}
                        className={`w-full px-4 py-2 text-sm font-semibold ${secondaryButtonClass}`}
                      >
                        {secondaryLabel}
                      </button>
                      {packNote ? (
                        <p className="text-xs font-medium leading-5 text-black/58">{packNote}</p>
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
                className={`px-4 py-2 text-xs font-semibold ${secondaryButtonClass}`}
              >
                Open series
              </button>
            ) : null}
            {onOpenStore ? (
              <button
                type="button"
                onClick={onOpenStore}
                className={`px-4 py-2 text-xs font-semibold ${secondaryButtonClass}`}
              >
                {STOREFRONT_TERMS.viewPointPacks}
              </button>
            ) : null}
            {onOpenSupport ? (
              <button
                type="button"
                onClick={onOpenSupport}
                className={`px-4 py-2 text-xs font-semibold ${secondaryButtonClass}`}
              >
                Support
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
