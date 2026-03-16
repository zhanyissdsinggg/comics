"use client";

import useCountdown from "../../hooks/useCountdown";
import { useSimilarRecommendations } from "../../hooks/useAIRecommendations";
import { OFFERS } from "../../lib/offers/catalog";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import StorefrontContinuationStrip from "../common/StorefrontContinuationStrip";
import ShareButton from "../common/ShareButton";

function formatPointsLabel(value) {
  return `${Number(value || 0)} points`;
}

function formatPackLabel(value) {
  const count = Number(value || 0);
  return `${count || 1} more episode${count === 1 ? "" : "s"}`;
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
  upcomingEpisodes = [],
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
  seriesId,
  series,
  sourcePath = "/",
  returnTo = sourcePath,
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
    ? `Unlock ${formatPackLabel(packOffer?.episodes || 3)} (${formatPointsLabel(packPrice)})`
    : singlePrice === 0
      ? "Unlock next episode free"
      : `Unlock next episode (${formatPointsLabel(singlePrice)})`;
  const secondaryLabel = showPackPrimary
    ? `Single episode (${formatPointsLabel(singlePrice)})`
    : `${formatPackLabel(packOffer?.episodes || 3)} (${formatPointsLabel(packPrice)})`;
  const packSavingsText = packOffer?.savingsPct
    ? `Save ${packOffer.savingsPct}%`
    : "";
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
  const queuePreview = Array.isArray(upcomingEpisodes) ? upcomingEpisodes.slice(0, 3) : [];
  const { data: similarSeries } = useSimilarRecommendations(seriesId, 4);
  const handlePrimary = () => {
    const primaryId = showPackPrimary ? packOfferId : "unlock_single";
    onOfferClick?.(primaryId);
    if (showPackPrimary) {
      onPackOffer?.(packOffer);
      return;
    }
    onUnlock();
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
      <div className="w-full max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-900/95 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400">{STOREFRONT_TERMS.readingDesk}</p>
            <p className="text-lg font-semibold">{nextEpisode.title}</p>
            {seriesTitle ? (
              <p className="mt-1 text-xs text-neutral-500">{seriesTitle}</p>
            ) : null}
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
                Read next
              </button>
            ) : null}
          </div>
        </div>

        {!nextUnlocked ? (
          <div className="mt-4 space-y-4">
            {discoveryContext ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/85">
                      Picked from
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      From {discoveryContext.sourceLabel} | {discoveryContext.laneValue}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-neutral-400">{discoveryContext.returnHint}</p>
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
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Wallet
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {Number(walletBalance || 0)} points
                </p>
                <p className="mt-1 text-xs text-neutral-500">Available before the next unlock.</p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Next unlock
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {singlePrice === 0 ? "Free" : formatPointsLabel(singlePrice)}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {pricingNote || "Unlock this chapter and keep the queue moving."}
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Reading mode
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {isSubscriber ? "Member" : "Standard"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {isSubscriber ? "Discounts and daily perks stay active." : "Points and packs stay available."}
                </p>
              </div>
            </div>

            {queuePreview.length > 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Keep the binge going</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      The next few chapters should feel visible before you commit.
                    </p>
                  </div>
                  {onViewSeries ? (
                    <button
                      type="button"
                      onClick={onViewSeries}
                      className="rounded-full border border-neutral-700 px-3 py-1 text-[11px] font-semibold text-neutral-200"
                    >
                      View series
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 space-y-2">
                  {queuePreview.map((episode, index) => (
                    <div
                      key={episode.id || `${episode.title}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-black/20 px-3 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-white">{episode.title}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {episode.unlocked
                            ? "Already unlocked"
                            : episode.ttfEligible
                              ? "Timed free unlock supported"
                              : "Premium chapter"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-neutral-300">
                        {episode.unlocked ? "Ready" : episode.pricePts ? `${episode.pricePts} pts` : "Locked"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <StorefrontContinuationStrip
              series={series}
              similarItems={similarSeries}
              sourcePath={sourcePath}
              returnTo={returnTo}
              entryPoint="READER_CONTINUE"
              includeValueCard={false}
              compact
            />

            <div className="grid gap-3 md:grid-cols-2">
            <button
              ref={primaryActionRef}
              type="button"
              onClick={handlePrimary}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                highlightPrimaryAction
                  ? "border-emerald-300/60 bg-emerald-400/14 text-emerald-50 shadow-[0_0_0_1px_rgba(110,231,183,0.26),0_20px_50px_rgba(16,185,129,0.2)] motion-safe:animate-pulse"
                  : "border-neutral-700"
              }`}
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
                  {STOREFRONT_TERMS.compareMembership}
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
                  onPackOffer?.(packOffer);
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
                <span>Single episode {formatPointsLabel(singlePrice)}</span>
                <span className="mx-2 text-neutral-600">--</span>
                <span>
                  {formatPackLabel(packOffer.episodes)} {formatPointsLabel(packPrice)}
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
                  Unlock free
                </button>
              ) : (
                <div
                  className={
                    countdownVariant === "B"
                      ? "flex flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3 text-xs text-neutral-200"
                      : "flex items-center justify-between rounded-full border border-neutral-800 px-4 py-2 text-xs text-neutral-300"
                  }
                >
                  <span>Free unlock in {formatted || "--:--:--"}</span>
                  <button
                    type="button"
                    onClick={() => onNotify?.()}
                    className={
                      countdownVariant === "B"
                        ? "self-start rounded-full border border-neutral-700 px-3 py-1 text-[10px]"
                        : "rounded-full border border-neutral-700 px-3 py-1 text-[10px]"
                    }
                  >
                    Remind me
                  </button>
                </div>
              )
            ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
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
        ) : null}
      </div>
    </div>
  );
}
