"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Gift, Sparkles, Wallet, X, Zap } from "lucide-react";
import {
  formatUSDisplayCurrency,
  formatUSNumber,
} from "../../lib/localization";
import { fetchTopupCatalogSnapshot } from "../../lib/topupCatalog";
import NetworkFallback from "../common/NetworkFallback";

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
  return formatUSDisplayCurrency(price, pkg?.currency);
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
    "relative w-full border border-[color:var(--gush-border)] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.1)] backdrop-blur-xl sm:max-w-xl sm:rounded-[32px]";
  const quietCardClass =
    "border-[color:var(--gush-border)] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:border-[color:var(--gush-border-strong)] hover:shadow-[0_14px_30px_rgba(15,23,42,0.06)]";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end justify-center p-0 transition-all duration-300 sm:items-center sm:p-4 ${
        isAnimating
          ? "bg-[rgba(15,23,42,0.34)] backdrop-blur-md"
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
        style={{
          borderTopLeftRadius: "1.75rem",
          borderTopRightRadius: "1.75rem",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),transparent_42%)]" />

        <div className="relative flex justify-center pb-2 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-white p-2 text-slate-500 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-900 active:scale-95"
          aria-label="Close top-up dialog"
        >
          <X size={18} />
        </button>

        <div className="relative p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[rgba(29,29,31,0.04)] text-[var(--gush-accent-strong,#0058cc)]">
                <Wallet size={30} />
              </div>
            </div>
            <h2 className="mb-2 font-display text-3xl font-semibold tracking-tight text-slate-950">
              Add points
            </h2>
            <p className="text-sm text-slate-500">
              Balance:{" "}
              <span className="font-semibold text-[var(--gush-accent-strong,#0058cc)]">
                {formatUSNumber(currentPoints)} points
              </span>
            </p>
          </div>

          {loading ? (
            <div className="mb-6 space-y-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]"
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
                    className={`relative w-full rounded-[24px] border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99] ${
                      isHighlighted
                        ? "border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.96))]"
                        : quietCardClass
                    }`}
                  >
                    {isHighlighted ? (
                      <div className="absolute -top-2 right-4 rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--gush-ink-strong)] shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
                        Best value
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${
                            isHighlighted
                              ? "bg-[rgba(29,29,31,0.04)] text-[var(--gush-accent-strong,#0058cc)]"
                              : "bg-[color:var(--gush-page-bg-muted)] text-slate-500"
                          }`}
                        >
                          <Zap size={22} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold text-slate-950">
                              {getPackageTitle(pkg)}
                            </span>
                            {bonusPts > 0 ? (
                              <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--gush-accent-strong,#0058cc)]">
                                <Gift size={12} />+{formatUSNumber(bonusPts)}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-500">
                            {packageSummary}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-semibold text-slate-950">
                          {formatPackagePrice(pkg)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {purchaseActionsEnabled ? "Continue" : "Open store"}
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
                    ? "Try again or open the store."
                    : "Open the store to see the full pack list."
                }
                onRetry={retryPackages}
              >
                <button
                  type="button"
                  onClick={() => handleSelectPackage({ id: "auto" })}
                  className="rounded-full bg-[color:var(--gush-ink-strong)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition hover:bg-black/82"
                >
                  Open store
                </button>
              </NetworkFallback>
            </div>
          )}

          <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[var(--gush-accent-strong,#0058cc)]">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-950">
                  {purchaseActionsEnabled
                    ? "Finish in store"
                    : "Open the store"}
                </p>
                <p className="text-xs leading-6 text-slate-600">
                  {purchaseActionsEnabled
                    ? "This selection opens the same offer in the store."
                    : "See the full pack list in the store."}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Store pricing stays in sync.
          </p>
        </div>
      </div>
    </div>
  );
});

export default WalletTopUpPrompt;
