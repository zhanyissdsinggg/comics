"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Gift, Sparkles, X, Zap } from "lucide-react";
import {
  formatUSDisplayCurrencyFromCents,
  formatUSNumber,
} from "../../lib/localization";
import { fetchTopupCatalogSnapshot } from "../../lib/topupCatalog";
import NetworkFallback from "../common/NetworkFallback";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontBadgeClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
  StorefrontSectionHeading,
} from "../common/StorefrontPagePrimitives";

function getPackageId(pkg) {
  return String(pkg?.packageId || pkg?.id || "").trim();
}

function getPackageTitle(pkg) {
  const label = String(pkg?.label || pkg?.name || "").trim();
  if (label) {
    return label;
  }

  const packageId = getPackageId(pkg);
  if (!packageId) {
    return "Points pack";
  }

  return packageId
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPackagePrice(pkg) {
  const price = Number(pkg?.price);
  if (!Number.isFinite(price) || price <= 0) {
    return "";
  }
  return formatUSDisplayCurrencyFromCents(price, pkg?.currency);
}

const WalletTopUpPrompt = memo(function WalletTopUpPrompt({
  isOpen = false,
  onClose,
  currentPoints = 0,
  onTopUp,
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [packages, setPackages] = useState([]);
  const [billingAvailability, setBillingAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const retryPackages = useCallback(() => {
    setRetryTick((current) => current + 1);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 50);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let mounted = true;
    setLoading(true);
    setLoadFailed(false);

    fetchTopupCatalogSnapshot()
      .then((snapshot) => {
        if (!mounted) {
          return;
        }
        setPackages(Array.isArray(snapshot?.packages) ? snapshot.packages : []);
        setBillingAvailability(snapshot?.billing || null);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setPackages([]);
        setBillingAvailability(null);
        setLoadFailed(true);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, retryTick]);

  const displayPackages = useMemo(() => {
    return [...packages]
      .filter((pkg) => getPackageId(pkg))
      .sort(
        (left, right) => Number(left?.price || 0) - Number(right?.price || 0),
      )
      .slice(0, 3);
  }, [packages]);

  const highlightedPackageId = useMemo(() => {
    const tagged = displayPackages.find(
      (pkg) =>
        Array.isArray(pkg?.tags) &&
        pkg.tags.some((tag) => /popular|best|value/i.test(String(tag))),
    );
    if (tagged) {
      return getPackageId(tagged);
    }

    return displayPackages.reduce((bestId, pkg) => {
      const packageId = getPackageId(pkg);
      const paidPts = Number(pkg?.paidPts || 0);
      const bonusPts = Number(pkg?.bonusPts || 0);
      const bestPackage = displayPackages.find(
        (item) => getPackageId(item) === bestId,
      );
      const bestPaidPts = Number(bestPackage?.paidPts || 0);
      const bestBonusPts = Number(bestPackage?.bonusPts || 0);
      const pkgBonusRatio = paidPts > 0 ? bonusPts / paidPts : 0;
      const bestBonusRatio = bestPaidPts > 0 ? bestBonusPts / bestPaidPts : 0;

      return pkgBonusRatio > bestBonusRatio ? packageId : bestId;
    }, getPackageId(displayPackages[0]));
  }, [displayPackages]);

  const purchaseActionsEnabled =
    billingAvailability?.purchaseActionsEnabled === true;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose?.();
    }, 260);
  };

  const handleSelectPackage = (pkg) => {
    handleClose();
    setTimeout(() => {
      onTopUp?.(pkg);
    }, 260);
  };

  const handleContentClick = (event) => {
    event.stopPropagation();
  };

  if (!isOpen) {
    return null;
  }

  const shellClass =
    "relative w-full overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,17,31,0.98)_0%,rgba(10,10,19,0.96)_100%)] text-white shadow-[0_28px_72px_rgba(5,5,15,0.42)] backdrop-blur-2xl sm:max-w-xl";
  const quietCardClass =
    "rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.03)_100%)] shadow-[0_18px_40px_rgba(8,6,20,0.22)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-white/16";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end justify-center p-0 transition-all duration-300 sm:items-center sm:p-4 ${
        isAnimating
          ? "bg-[rgba(6,7,16,0.76)] backdrop-blur-xl"
          : "bg-transparent"
      }`}
      onClick={handleClose}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        onClick={handleContentClick}
        className={`${shellClass} transition-all duration-300 ${
          isAnimating
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-full opacity-0 sm:translate-y-0 sm:scale-[0.98]"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,99,168,0.15),transparent_30%),radial-gradient(circle_at_top_right,rgba(92,228,255,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-[1px] rounded-[29px] border border-white/6" />
        <div className="relative border-b border-white/10 px-6 py-5 sm:px-7 sm:py-6">
          <div className="relative flex justify-center pb-2 sm:hidden">
            <div className="h-1.5 w-11 rounded-full bg-white/15" />
          </div>

          <button
            type="button"
            onClick={handleClose}
            className={`absolute right-4 top-4 z-10 min-h-[44px] min-w-[44px] justify-center px-0 py-0 text-white active:scale-95 ${storefrontSecondaryButtonClass}`}
            aria-label="Close top-up dialog"
          >
            <X size={18} />
          </button>

          <div className="text-center">
            <p className={`mb-3 ${storefrontBadgeClass}`}>
              Wallet
            </p>
            <h2 className="font-display text-[2.7rem] font-semibold leading-none tracking-[-0.06em] text-white">
              Add points
            </h2>
            <p className="mt-3 text-sm font-semibold text-white/75">
              Balance:{" "}
              <span className="font-semibold text-white">
                {formatUSNumber(currentPoints)} points
              </span>
            </p>
          </div>
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className={`${storefrontInfoCardClass} px-4 py-3`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/46">
                Balance
              </p>
              <p className="mt-2 text-sm font-semibold text-white/82">
                {formatUSNumber(currentPoints)} points
              </p>
            </div>
            <div className={`${storefrontInfoCardClass} px-4 py-3`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/46">
                Pack state
              </p>
              <p className="mt-2 text-sm font-semibold text-white/82">
                {loading
                  ? "Loading offers"
                  : displayPackages.length > 0
                    ? `${displayPackages.length} packs ready`
                    : "Open store route"}
              </p>
            </div>
            <div className={`${storefrontInfoCardClass} px-4 py-3`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/46">
                Checkout
              </p>
              <p className="mt-2 text-sm font-semibold text-white/82">
                {purchaseActionsEnabled ? "Open offer in store" : "Browse pack list"}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <StorefrontSectionHeading
              eyebrow="Top-up picks"
              title="Choose the pack that keeps your reading pace steady"
              description="Small pack for one more session, bigger pack if you already know tonight is going long."
            />
          </div>

          {loading ? (
            <div className="mb-6 space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className={`h-24 animate-pulse ${storefrontSoftCardClass}`} />
              ))}
            </div>
          ) : displayPackages.length > 0 ? (
            <div className="mb-6 space-y-3">
              {displayPackages.map((pkg) => {
                const packageId = getPackageId(pkg);
                const paidPts = Number(pkg?.paidPts || 0);
                const bonusPts = Number(pkg?.bonusPts || 0);
                const totalPts = paidPts + bonusPts;
                const isHighlighted = highlightedPackageId === packageId;
                const packageSummary =
                  bonusPts > 0
                    ? `${formatUSNumber(paidPts)} paid, ${formatUSNumber(totalPts)} total`
                    : `${formatUSNumber(paidPts)} paid`;

                return (
                  <button
                    key={packageId}
                    type="button"
                    onClick={() =>
                      handleSelectPackage({ ...pkg, id: packageId })
                    }
                    className={`relative w-full p-4 text-left transition-all duration-300 active:scale-[0.99] ${
                      isHighlighted
                        ? "rounded-[24px] border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(92,228,255,0.18)_0%,rgba(255,255,255,0.05)_100%)] shadow-[0_22px_48px_rgba(8,6,20,0.24)] outline outline-2 outline-offset-2 outline-cyan-300/28"
                        : quietCardClass
                    }`}
                  >
                    {isHighlighted ? (
                      <div className="absolute -top-2 right-4 rounded-full border border-[rgba(255,214,130,0.22)] bg-[linear-gradient(135deg,#f6c25f_0%,#ffd97f_100%)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#241608] shadow-[0_12px_24px_rgba(246,194,95,0.22)]">
                        Best value
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${
                            isHighlighted
                              ? "border border-cyan-300/24 bg-[rgba(92,228,255,0.18)] text-cyan-100 shadow-[0_14px_30px_rgba(8,6,20,0.22)]"
                              : "border border-white/10 bg-[rgba(255,255,255,0.035)] text-white/80 shadow-[0_14px_30px_rgba(8,6,20,0.18)]"
                          }`}
                        >
                          <Zap size={22} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold tracking-[0.01em] text-white">
                              {getPackageTitle(pkg)}
                            </span>
                            {bonusPts > 0 ? (
                              <span className="flex items-center gap-1 rounded-full border border-[rgba(255,214,130,0.22)] bg-[rgba(247,195,91,0.18)] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#fff1c8]">
                                <Gift size={12} />+{formatUSNumber(bonusPts)}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs font-semibold text-white/70">
                            {packageSummary}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-display text-[1.6rem] font-semibold tracking-[-0.04em] text-white">
                          {formatPackagePrice(pkg)}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-white/58">
                          {purchaseActionsEnabled ? "Add Points" : "View Store"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mb-6">
              <NetworkFallback
                compact
                className="px-0 py-0"
                cardClassName="max-w-none rounded-[24px] px-4 py-5 sm:px-5 sm:py-6"
                title="Point packs are unavailable right now."
                description={
                  loadFailed
                    ? "Retry or view the store."
                    : "View the store to see the full pack list."
                }
                onRetry={retryPackages}
              >
                <button
                  type="button"
                  onClick={() => handleSelectPackage({ id: "auto" })}
                  className={`${storefrontPrimaryButtonClass} h-11 px-4 text-[11px] tracking-[0.08em]`}
                >
                  View Store
                </button>
              </NetworkFallback>
            </div>
          )}

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="dark"
            className="p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-[rgba(92,228,255,0.16)] text-cyan-100 shadow-[0_10px_22px_rgba(8,6,20,0.18)]">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold tracking-[0.01em] text-white">
                  {purchaseActionsEnabled
                    ? "Finish in store"
                    : "View the store"}
                </p>
                <p className="text-xs font-semibold leading-6 text-white/75">
                  {purchaseActionsEnabled
                    ? "This selection opens the same offer in the store."
                    : "See the full pack list in the store."}
                </p>
              </div>
            </div>
          </SurfacePanel>

          <p className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Store pricing stays in sync.
          </p>
        </div>
      </div>
    </div>
  );
});

export default WalletTopUpPrompt;
