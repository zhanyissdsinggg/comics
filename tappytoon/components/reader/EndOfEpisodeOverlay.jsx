"use client";

import useCountdown from "../../hooks/useCountdown";
import { OFFERS } from "../../lib/offers/catalog";
import ShareButton from "../common/ShareButton";

export default function EndOfEpisodeOverlay({
  open,
  nextEpisode,
  nextUnlocked,
  decision,
  pricing,
  packPricing,
  onNext,
  onUnlock,
  onSubscribe,
  onClaim,
  onNotify,
  onOfferClick,
  onPackOffer,
  seriesTitle,
  episodeTitle,
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
  const anchorVariant = decision?.priceAnchoringVariant || "A";
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
    ? `Unlock ${packOffer?.episodes || 3} Pack (${packPrice} POINTS)`
    : singlePrice === 0
      ? "Unlock Next (Free)"
      : `Unlock Next (${singlePrice} POINTS)`;
  const secondaryLabel = showPackPrimary
    ? `Single (${singlePrice} POINTS)`
    : `Pack Offer (${packPrice} POINTS)`;
  const packSavingsText = packOffer?.savingsPct
    ? `Save ${packOffer.savingsPct}%`
    : "";
  const pricingNote = pricing?.appliedDailyFree
    ? "Daily free available"
    : pricing?.appliedCoupon?.label ||
      (pricing?.discountPct ? `Subscriber ${pricing.discountPct}% off` : "");
  const packNote =
    packPricing?.appliedCoupon?.label ||
    (packPricing?.discountPct ? `Subscriber ${packPricing.discountPct}% off` : "");
  const subscriptionNote =
    "Subscribe to get daily free unlocks, faster TTF, and bundle savings.";
  const upsellBadge = showSubscribe ? "Recommended" : "";
  const handlePrimary = () => {
    const primaryId = showPackPrimary ? packOfferId : "unlock_single";
    onOfferClick?.(primaryId);
    if (showPackPrimary) {
      onPackOffer?.(packOfferId);
      return;
    }
    onUnlock();
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
      <div className="w-full max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-900/95 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400">Next Episode</p>
            <p className="text-lg font-semibold">{nextEpisode.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* 老王注释：分享按钮 */}
            <ShareButton
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={`${seriesTitle || "Series"} - ${episodeTitle || "Episode"}`}
              description={`I just finished reading this episode! Check it out.`}
              className=""
            />
            {nextUnlocked ? (
              <button
                type="button"
                onClick={onNext}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
              >
                Next
              </button>
            ) : null}
          </div>
        </div>

        {!nextUnlocked ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={handlePrimary}
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm"
            >
              {primaryLabel}
              {showPackPrimary && packSavingsText ? (
                <span className="ml-2 text-xs text-emerald-300">{packSavingsText}</span>
              ) : null}
            </button>
            {pricingNote ? (
              <div className="flex items-center text-xs text-neutral-400">
                {pricingNote}
              </div>
            ) : null}
            {showSubscribe ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOfferClick?.("subscribe_basic");
                    onSubscribe();
                  }}
                  className="rounded-full border border-neutral-700 px-4 py-2 text-sm"
                >
                  Subscribe for perks
                  {upsellBadge ? (
                    <span className="ml-2 text-[10px] text-emerald-300">{upsellBadge}</span>
                  ) : null}
                </button>
                <p className="text-xs text-neutral-400">{subscriptionNote}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const offerId = showPackPrimary ? "unlock_single" : packOfferId;
                  onOfferClick?.(offerId);
                  if (showPackPrimary) {
                    onUnlock();
                    return;
                  }
                  onPackOffer?.(offerId);
                }}
                className="rounded-full border border-neutral-700 px-4 py-2 text-sm"
              >
                {secondaryLabel}
              </button>
            )}
            {packNote && !showPackPrimary ? (
              <div className="flex items-center text-xs text-neutral-400">
                {packNote}
              </div>
            ) : null}
            {anchorVariant !== "A" && packOffer ? (
              <div className="rounded-2xl border border-neutral-800 px-4 py-2 text-xs text-neutral-300">
                <span>Single {singlePrice} POINTS</span>
                <span className="mx-2 text-neutral-600">--</span>
                <span>
                  {packOffer.episodes} Pack {packPrice} POINTS
                </span>
              </div>
            ) : null}
            {showTtf ? (
              isReady ? (
                <button
                  type="button"
                  onClick={onClaim}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
                >
                  Claim Free
                </button>
              ) : (
                <div
                  className={
                    countdownVariant === "B"
                      ? "flex flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3 text-xs text-neutral-200"
                      : "flex items-center justify-between rounded-full border border-neutral-800 px-4 py-2 text-xs text-neutral-300"
                  }
                >
                  <span>TTF in {formatted || "--:--:--"}</span>
                  <button
                    type="button"
                    onClick={() => onNotify?.()}
                    className={
                      countdownVariant === "B"
                        ? "self-start rounded-full border border-neutral-700 px-3 py-1 text-[10px]"
                        : "rounded-full border border-neutral-700 px-3 py-1 text-[10px]"
                    }
                  >
                    Notify me
                  </button>
                </div>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
