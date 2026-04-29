"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Gift, Sparkles, X, Zap } from "lucide-react";
import {
  formatUSDisplayCurrency,
  formatUSDisplayCurrencyFromCents,
  formatUSNumber,
} from "../../lib/localization";
import { fetchTopupCatalogSnapshot } from "../../lib/topupCatalog";
import NetworkFallback from "../common/NetworkFallback";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
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
    "relative w-full overflow-hidden rounded-[26px] border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:max-w-xl";
  const quietCardClass =
    "rounded-[22px] border-2 border-black bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end justify-center p-0 transition-all duration-300 sm:items-center sm:p-4 ${
        isAnimating
          ? "bg-black/82 backdrop-blur-md"
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
        <div className="border-b-2 border-black bg-black px-6 py-5 sm:px-7 sm:py-6">
          <div className="relative flex justify-center pb-2 sm:hidden">
            <div className="h-1.5 w-11 rounded-full bg-white/15" />
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-black bg-[#FFE500] p-2 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95"
            aria-label="Close top-up dialog"
          >
            <X size={18} />
          </button>

          <div className="text-center">
            <p className="mb-3 inline-flex rounded-full border-2 border-black bg-[#0b0b0b] px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-white/70 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              Wallet
            </p>
            <h2 className="text-4xl font-black uppercase leading-none tracking-[-0.06em] text-white">
              Add points
            </h2>
            <p className="mt-3 text-sm font-semibold text-white/75">
              Balance:{" "}
              <span className="font-black text-white">
                {formatUSNumber(currentPoints)} points
              </span>
            </p>
          </div>
        </div>

        <div className="relative p-6 sm:p-8">
          {loading ? (
            <div className="mb-6 space-y-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-[22px] border-2 border-black bg-[#111111]"
                />
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
                        ? "rounded-[22px] border-2 border-black bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] outline outline-2 outline-offset-2 outline-[#00E5FF]"
                        : quietCardClass
                    }`}
                  >
                    {isHighlighted ? (
                      <div className="absolute -top-2 right-4 rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        Best value
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${
                            isHighlighted
                              ? "border-2 border-black bg-[#00E5FF] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                              : "border-2 border-black bg-[#0b0b0b] text-white/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                          }`}
                        >
                          <Zap size={22} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black uppercase tracking-[0.03em] text-white">
                              {getPackageTitle(pkg)}
                            </span>
                            {bonusPts > 0 ? (
                              <span className="flex items-center gap-1 rounded-full border-2 border-black bg-[#FFE500] px-2.5 py-1 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
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
                        <div className="text-xl font-black uppercase tracking-[0.03em] text-white">
                          {formatPackagePrice(pkg)}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-white/65">
                          {purchaseActionsEnabled ? "Get Points" : "View Store"}
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

          <SurfacePanel tone="muted" accent="blue" appearance="dark" className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-black bg-[#00E5FF] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="mb-1 text-sm font-black uppercase tracking-[0.08em] text-white">
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
