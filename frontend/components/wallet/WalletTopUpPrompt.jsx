"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Wallet, Sparkles, Zap, Gift, X } from "lucide-react";
import { formatUSCurrency, formatUSNumber } from "../../lib/localization";
import { fetchTopupCatalogSnapshot } from "../../lib/topupCatalog";

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
    return "Point pack";
  }

  return packageId
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPackagePrice(pkg) {
  const price = Number(pkg?.price);
  const currency = String(pkg?.currency || "USD").toUpperCase();
  if (!Number.isFinite(price) || price <= 0) {
    return "";
  }
  if (currency === "USD") {
    return formatUSCurrency(price);
  }
  return `${currency} ${price.toFixed(2)}`;
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
  }, [isOpen]);

  const displayPackages = useMemo(() => {
    return [...packages]
      .filter((pkg) => getPackageId(pkg))
      .sort((left, right) => Number(left?.price || 0) - Number(right?.price || 0))
      .slice(0, 3);
  }, [packages]);

  const highlightedPackageId = useMemo(() => {
    const tagged = displayPackages.find((pkg) =>
      Array.isArray(pkg?.tags) && pkg.tags.some((tag) => /popular|best|value/i.test(String(tag))),
    );
    if (tagged) {
      return getPackageId(tagged);
    }

    return displayPackages.reduce(
      (bestId, pkg) => {
        const packageId = getPackageId(pkg);
        const paidPts = Number(pkg?.paidPts || 0);
        const bonusPts = Number(pkg?.bonusPts || 0);
        const bestPackage = displayPackages.find((item) => getPackageId(item) === bestId);
        const bestPaidPts = Number(bestPackage?.paidPts || 0);
        const bestBonusPts = Number(bestPackage?.bonusPts || 0);
        const pkgBonusRatio = paidPts > 0 ? bonusPts / paidPts : 0;
        const bestBonusRatio = bestPaidPts > 0 ? bestBonusPts / bestPaidPts : 0;

        return pkgBonusRatio > bestBonusRatio ? packageId : bestId;
      },
      getPackageId(displayPackages[0]),
    );
  }, [displayPackages]);

  const purchaseActionsEnabled = billingAvailability?.purchaseActionsEnabled === true;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const handleSelectPackage = (pkg) => {
    handleClose();
    setTimeout(() => {
      onTopUp?.(pkg);
    }, 300);
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end justify-center p-0 transition-all duration-300 sm:items-center sm:p-4 ${
        isAnimating ? "bg-black/60 backdrop-blur-sm" : "bg-black/0"
      }`}
      onClick={handleClose}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        onClick={handleContentClick}
        className={`relative w-full border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur-xl transition-all duration-300 sm:max-w-lg sm:rounded-3xl ${
          isAnimating
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-full opacity-0 sm:translate-y-0 sm:scale-95"
        }`}
        style={{
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem",
        }}
      >
        <div className="flex justify-center pb-2 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-neutral-700" />
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-neutral-400 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-400">
                <Wallet size={32} />
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">Explore point packs</h2>
            <p className="text-sm text-neutral-400">
              Current balance: <span className="font-semibold text-emerald-400">{formatUSNumber(currentPoints)} points</span>
            </p>
          </div>

          {loading ? (
            <div className="mb-6 space-y-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/50"
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

                return (
                  <button
                    key={packageId}
                    type="button"
                    onClick={() => handleSelectPackage({ ...pkg, id: packageId })}
                    className={`relative w-full rounded-2xl border p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                      isHighlighted
                        ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5"
                        : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                    }`}
                  >
                    {isHighlighted ? (
                      <div className="absolute -top-2 right-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                        Featured
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                            isHighlighted ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          <Zap size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white">{getPackageTitle(pkg)}</span>
                            {bonusPts > 0 ? (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                                <Gift size={12} />
                                +{formatUSNumber(bonusPts)}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-neutral-400">
                            {formatUSNumber(paidPts)} paid points
                            {bonusPts > 0 ? ` · ${formatUSNumber(totalPts)} total` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">{formatPackagePrice(pkg)}</div>
                        <div className="text-xs text-neutral-500">
                          {purchaseActionsEnabled ? "Open in store" : "Preview in store"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-300">
              <p className="font-semibold text-white">Package details are unavailable right now.</p>
              <p className="mt-2 text-neutral-400">
                {loadFailed
                  ? "The latest catalog could not be loaded, but you can still open the store overview."
                  : "Open the store overview to review packages and billing details."}
              </p>
              <button
                type="button"
                onClick={() => handleSelectPackage({ id: "auto" })}
                className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Open store
              </button>
            </div>
          )}

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold text-emerald-400">
                  {purchaseActionsEnabled ? "Checkout available" : "Checkout preview only"}
                </p>
                <p className="text-xs text-neutral-400">
                  {purchaseActionsEnabled
                    ? "Choose a pack to jump straight into the store with the matching offer already focused."
                    : "You can review the live pack mix now, and checkout will unlock once secure billing is enabled."}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-neutral-500">
            Store pricing stays synced with the backend catalog so promo modals do not drift away from the actual checkout surface.
          </p>
        </div>
      </div>
    </div>
  );
});

export default WalletTopUpPrompt;
