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
    <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gush-accent-strong,#0058cc)]">
            Opened from
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {discoveryContext.sourceLabel} / {discoveryContext.laneValue}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {discoveryContext.returnHint}
          </p>
        </div>
        {onReturnToSource ? (
          <button
            type="button"
            onClick={onReturnToSource}
            className="rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
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
            ? "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-slate-700"
            : "border-[color:var(--gush-border)] bg-white text-slate-600"
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
    ? "rounded-full border border-[color:var(--gush-ink-strong)] bg-[color:var(--gush-ink-strong)] text-white shadow-[0_0_0_4px_rgba(15,23,42,0.05),0_16px_30px_rgba(15,23,42,0.12)]"
    : "rounded-full border border-[color:var(--gush-ink-strong)] bg-[color:var(--gush-ink-strong)] text-white shadow-[0_12px_24px_rgba(15,23,42,0.08)] hover:bg-black/82";
  const secondaryButtonClass =
    "rounded-full border border-[color:var(--gush-border)] bg-white text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]";

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
      <div className="w-full max-w-2xl rounded-[32px] border border-[color:var(--gush-border)] bg-white p-5 shadow-[0_20px_52px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Next episode</p>
            <p className="text-lg font-semibold text-slate-950">
              {nextEpisode.title}
            </p>
            {seriesTitle ? (
              <p className="mt-1 text-xs text-slate-500">{seriesTitle}</p>
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
            <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gush-accent-strong,#0058cc)]">
                    Ready now
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">
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
            <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gush-accent-strong,#0058cc)]">
                    Continue
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">
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
                        className="mt-4 rounded-full bg-[color:var(--gush-ink-strong)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition hover:bg-black/82"
                      >
                        Open now
                      </button>
                    ) : (
                      <div
                        className={`mt-4 ${
                          countdownVariant === "B"
                            ? "flex flex-col gap-2 rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-xs text-slate-600"
                            : "flex flex-wrap items-center gap-3 rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-2 text-xs text-slate-600"
                        }`}
                      >
                        <span>Free in {formatted || "--:--:--"}</span>
                        <button
                          type="button"
                          onClick={() => onNotify?.()}
                          className={`px-3 py-1 text-[10px] font-semibold ${secondaryButtonClass}`}
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
                    <p className="text-xs font-semibold text-[var(--gush-accent-strong,#0058cc)]">
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
                          <span className="ml-2 text-[10px] text-[var(--gush-accent-strong,#0058cc)]">
                            {upsellBadge}
                          </span>
                        ) : null}
                      </button>
                      <p className="text-xs text-slate-500">
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
                        <p className="text-xs text-slate-500">{packNote}</p>
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
