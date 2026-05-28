"use client";

import useCountdown from "../../hooks/useCountdown";
import { OFFERS } from "../../lib/offers/catalog";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import { siteConfig } from "../../lib/siteConfig";
import { getInstallmentLabel } from "../../lib/seriesFormatLabels";
import ShareButton from "../common/ShareButton";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

function formatPointsLabel(value) {
  return `${Number(value || 0)} points`;
}

function formatPackLabel(value, seriesType) {
  const count = Number(value || 0);
  const installmentLabel = getInstallmentLabel(seriesType, {
    plural: count !== 1,
  }).toLowerCase();
  return `${count || 1} more ${installmentLabel}`;
}

function DiscoveryContextCard({ discoveryContext, onReturnToSource }) {
  if (!discoveryContext) {
    return null;
  }

  const accentTextClass = "text-[color:var(--gush-accent,#3157d6)]";

  return (
    <div className="rounded-[24px] border-[3px] border-white/20 bg-black px-4 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className={`text-[11px] font-black uppercase tracking-[0.24em] ${accentTextClass}`}
          >
            From
          </p>
          <p className="mt-2 text-sm font-black uppercase tracking-[0.02em] text-white">
            {discoveryContext.sourceLabel} | {discoveryContext.laneValue}
          </p>
        </div>
        {onReturnToSource ? (
          <button
            type="button"
            onClick={onReturnToSource}
            className={`${storefrontSecondaryButtonClass} px-3 py-1.5 text-[11px]`}
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
      className={`rounded-full border-2 border-black px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${
        accent
          ? "bg-[#FFE500] text-black"
          : "bg-black text-white/70 border-white/20"
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
  seriesType,
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
  const installmentLabel = getInstallmentLabel(seriesType);
  const installmentLabelLower = installmentLabel.toLowerCase();
  const primaryLabel = showPackPrimary
    ? `Unlock ${formatPackLabel(packOffer?.episodes || 3, seriesType)}`
    : singlePrice === 0
      ? "Read Free"
      : `Unlock Next - ${formatPointsLabel(singlePrice)}`;
  const secondaryLabel = showPackPrimary
    ? singlePrice === 0
      ? `Just this ${installmentLabelLower}`
      : `Just this ${installmentLabelLower} (${formatPointsLabel(singlePrice)})`
    : `${formatPackLabel(packOffer?.episodes || 3, seriesType)} (${formatPointsLabel(packPrice)})`;
  const packSavingsText = packOffer?.savingsPct
    ? `Save ${packOffer.savingsPct}% with the pack.`
    : "";
  const pricingNote = pricing?.appliedDailyFree
    ? "Free now"
    : pricing?.appliedCoupon?.label ||
      (pricing?.discountPct ? `${pricing.discountPct}% off` : "");
  const packNote =
    packPricing?.appliedCoupon?.label ||
    (packPricing?.discountPct ? `${packPricing.discountPct}% off` : "");
  const subscriptionNote = `Free reads plus lower ${installmentLabelLower} prices.`;
  const upsellBadge = showSubscribe ? "Best" : "";
  const checkoutEnabled = siteConfig.monetization.checkoutEnabled === true;
  const previewOnlyMode = !checkoutEnabled && !nextUnlocked;
  const nextEpisodeStatusLabel = nextUnlocked
    ? "Ready now"
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
    ? `${storefrontPrimaryButtonClass} outline outline-2 outline-offset-2 outline-[#FFE500]`
    : storefrontPrimaryButtonClass;
  const secondaryButtonClass = storefrontSecondaryButtonClass;
  const accentTextClass = "text-[color:var(--gush-accent,#3157d6)]";
  const previewPrimaryLabel = showSubscribe
    ? "See Membership"
    : "Open Store";
  const previewSecondaryLabel = showSubscribe
    ? "Open Store"
    : "See Membership";

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
      <div className="w-full max-w-2xl rounded-[32px] border-[3px] border-white/20 bg-black p-5 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-white/55">
              Next {installmentLabel.toLowerCase()}
            </p>
            <p className="text-lg font-black uppercase tracking-[-0.03em] text-white">
              {nextEpisode.title}
            </p>
            {seriesTitle ? (
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/58">
                {seriesTitle}
              </p>
            ) : null}
          </div>
          <ShareButton
            url={typeof window !== "undefined" ? window.location.href : ""}
            title={`${seriesTitle || "Series"} - ${episodeTitle || installmentLabel}`}
            description=""
            className=""
          />
        </div>

        <div className="mt-4 space-y-4">
          <DiscoveryContextCard
            discoveryContext={discoveryContext}
            onReturnToSource={onReturnToSource}
          />

          {nextUnlocked ? (
            <div className="rounded-[26px] border-[3px] border-white/20 bg-black px-4 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p
                    className={`text-[11px] font-black uppercase tracking-[0.24em] ${accentTextClass}`}
                  >
                    Ready now
                  </p>
                  <h3 className="mt-2 text-xl font-black uppercase tracking-[-0.03em] text-white">
                    {nextEpisode.title}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetaPill accent>{nextEpisodeStatusLabel}</MetaPill>
                    <MetaPill>{isSubscriber ? "Member" : "Ready"}</MetaPill>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    ref={primaryActionRef}
                    type="button"
                    onClick={onNext}
                    className={`px-4 py-2 text-sm ${primaryButtonClass}`}
                  >
                    Keep Reading
                  </button>
                  {onViewSeries ? (
                    <button
                      type="button"
                      onClick={onViewSeries}
                      className={`px-4 py-2 text-sm ${secondaryButtonClass}`}
                    >
                      View Series
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[26px] border-[3px] border-white/20 bg-black px-4 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <p
                    className={`text-[11px] font-black uppercase tracking-[0.24em] ${accentTextClass}`}
                  >
                    Next
                  </p>
                  <h3 className="mt-2 text-xl font-black uppercase tracking-[-0.03em] text-white">
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
                        className={`mt-4 px-4 py-2 text-sm ${storefrontSecondaryButtonClass}`}
                      >
                        Claim now
                      </button>
                    ) : (
                      <div
                        className={`mt-4 ${
                          countdownVariant === "B"
                            ? "flex flex-col gap-2 rounded-[22px] border-[3px] border-white/20 bg-black px-4 py-3 text-xs font-semibold text-white/70 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                            : "flex flex-wrap items-center gap-3 rounded-[22px] border-[3px] border-white/20 bg-black px-4 py-2 text-xs font-semibold text-white/70 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                        }`}
                      >
                        <span>Free in {formatted || "--:--:--"}</span>
                        <button
                          type="button"
                          onClick={() => onNotify?.()}
                          className={`px-3 py-1 text-[10px] ${secondaryButtonClass}`}
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
                    className={`w-full px-4 py-2 text-sm ${primaryButtonClass}`}
                  >
                    {previewOnlyMode ? previewPrimaryLabel : primaryLabel}
                  </button>

                  {showPackPrimary && packSavingsText ? (
                    <p
                      className={`text-xs font-black uppercase tracking-[0.08em] ${accentTextClass}`}
                    >
                      {packSavingsText}
                    </p>
                  ) : null}

                  {showSubscribe ? (
                    <>
                      <button
                        type="button"
                        onClick={previewOnlyMode ? handleSecondary : () => {
                          onOfferClick?.("subscribe_basic");
                          onSubscribe();
                        }}
                        className={`w-full px-4 py-2 text-sm ${secondaryButtonClass}`}
                      >
                        {previewOnlyMode
                          ? previewSecondaryLabel
                          : STOREFRONT_TERMS.compareMembership}
                        {upsellBadge ? (
                          <span
                            className={`ml-2 text-[10px] font-black uppercase tracking-[0.08em] ${accentTextClass}`}
                          >
                            {upsellBadge}
                          </span>
                        ) : null}
                      </button>
                      <p className="text-xs font-semibold leading-5 text-white/70">
                        {subscriptionNote}
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleSecondary}
                        className={`w-full px-4 py-2 text-sm ${secondaryButtonClass}`}
                      >
                        {previewOnlyMode
                          ? previewSecondaryLabel
                          : secondaryLabel}
                      </button>
                      {packNote ? (
                        <p className="text-xs font-semibold leading-5 text-white/70">
                          {packNote}
                        </p>
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
                View Series
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
                Help
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
