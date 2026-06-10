"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { OFFERS } from "../../lib/offers/catalog";
import {
  formatUSDisplayCurrencyFromCents,
  formatUSNumber,
} from "../../lib/localization";
import { getRegionConfig } from "../../lib/region/config";
import { fetchTopupCatalogSnapshot } from "../../lib/topupCatalog";
import {
  storefrontAccentChipClass,
  storefrontBadgeClass,
  storefrontInfoCardClass,
  storefrontNoticeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
} from "../common/StorefrontPagePrimitives";
import { getInstallmentLabel } from "../../lib/seriesFormatLabels";

const DEFAULT_PACKAGE_IDS = ["starter", "medium", "value"];
const US_REGION = getRegionConfig("us");

function normalizePackageId(value) {
  return String(value || "")
    .replace(/^points_pack_/, "")
    .trim()
    .toLowerCase();
}

function titleCase(value) {
  return String(value || "")
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getFallbackPackage(packageId) {
  const offer = OFFERS[`points_pack_${packageId}`];
  const config = US_REGION.pointsPackages?.[packageId];
  if (!offer || !config) {
    return null;
  }

  return {
    id: packageId,
    name: offer.name || titleCase(packageId),
    priceLabel: config.priceLabel || "",
    paidPts: Number(offer.paidPts || 0),
    bonusPts: Number(offer.bonusPts || 0),
    totalPts: Number(offer.paidPts || 0) + Number(offer.bonusPts || 0),
    tag: offer.tag || "",
  };
}

function resolveFallbackPackages() {
  return DEFAULT_PACKAGE_IDS.map((packageId) =>
    getFallbackPackage(packageId),
  ).filter(Boolean);
}

function resolvePackageName(pkg) {
  const label = String(pkg?.label || pkg?.name || "").trim();
  if (label) {
    return label;
  }

  const packageId = normalizePackageId(pkg?.packageId || pkg?.id);
  return packageId ? titleCase(packageId) : "Points";
}

function resolvePackageTag(pkg, packageId) {
  const tags = Array.isArray(pkg?.tags) ? pkg.tags.filter(Boolean) : [];
  if (tags.length > 0) {
    const primaryTag = String(tags[0]);
    return /popular/i.test(primaryTag) ? "" : primaryTag;
  }

  const fallbackTag = OFFERS[`points_pack_${packageId}`]?.tag || "";
  return /popular/i.test(String(fallbackTag)) ? "" : fallbackTag;
}

function resolvePackagePriceLabel(pkg, packageId) {
  const configLabel = US_REGION.pointsPackages?.[packageId]?.priceLabel;
  if (configLabel) {
    return configLabel;
  }

  const price = Number(pkg?.price);
  if (Number.isFinite(price) && price > 0) {
    return formatUSDisplayCurrencyFromCents(price, pkg?.currency);
  }

  return "";
}

function normalizeDisplayPackage(pkg) {
  const id = normalizePackageId(pkg?.packageId || pkg?.id);
  if (!id) {
    return null;
  }

  const paidPts = Number(
    pkg?.paidPts || OFFERS[`points_pack_${id}`]?.paidPts || 0,
  );
  const bonusPts = Number(
    pkg?.bonusPts || OFFERS[`points_pack_${id}`]?.bonusPts || 0,
  );
  const totalPts = Number(pkg?.points || paidPts + bonusPts);
  const priceLabel = resolvePackagePriceLabel(pkg, id);

  if (!priceLabel || totalPts <= 0) {
    return getFallbackPackage(id);
  }

  return {
    id,
    name: resolvePackageName(pkg),
    priceLabel,
    paidPts,
    bonusPts,
    totalPts,
    tag: resolvePackageTag(pkg, id),
  };
}

function buildDisplayPackages(packages) {
  const normalizedPackages = Array.isArray(packages)
    ? packages.map((pkg) => normalizeDisplayPackage(pkg)).filter(Boolean)
    : [];
  const byId = new Map(normalizedPackages.map((pkg) => [pkg.id, pkg]));
  const prioritized = DEFAULT_PACKAGE_IDS.map((id) => byId.get(id)).filter(
    Boolean,
  );

  if (prioritized.length >= 2) {
    return prioritized.slice(0, 3);
  }

  return normalizedPackages.slice(0, 3);
}

function getHighlightPackageId(packages, preferredPackageId) {
  const normalizedPreferred = normalizePackageId(preferredPackageId);
  if (
    normalizedPreferred &&
    packages.some((pkg) => pkg.id === normalizedPreferred)
  ) {
    return normalizedPreferred;
  }

  const taggedPackage = packages.find((pkg) =>
    /popular|best/i.test(String(pkg.tag || "")),
  );
  if (taggedPackage) {
    return taggedPackage.id;
  }

  return packages[1]?.id || packages[0]?.id || "";
}

function getPrimaryButtonLabel({
  isSignedIn,
  insufficient,
  busyAction,
  previewOnlyTopup,
}) {
  if (busyAction === "unlock") {
    return "Unlocking...";
  }
  if (!isSignedIn) {
    return "Sign in";
  }
  if (insufficient) {
    return previewOnlyTopup ? "Store Preview" : "Get More Points";
  }
  return "Unlock";
}

export default function UnlockChapterModal({
  open,
  installmentNumber,
  seriesType,
  pricePts = 0,
  walletBalance = 0,
  shortfallPts = 0,
  isSignedIn = false,
  view = "confirm",
  busyAction = "",
  checkoutEnabled = true,
  preferredPackageId = "",
  onViewChange,
  onConfirmUnlock,
  onBuyPack,
  onOpenStore,
  onClose,
}) {
  const fallbackPackages = useMemo(() => resolveFallbackPackages(), []);
  const [packages, setPackages] = useState(fallbackPackages);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [packagesUsingFallback, setPackagesUsingFallback] = useState(false);

  const resolvedPrice = Number(pricePts || 0);
  const resolvedWalletBalance = Number(walletBalance || 0);
  const computedShortfall = Math.max(
    0,
    Number(shortfallPts || 0) ||
      Math.max(0, resolvedPrice - resolvedWalletBalance),
  );
  const insufficient = isSignedIn && resolvedWalletBalance < resolvedPrice;
  const highlightPackageId = getHighlightPackageId(
    packages,
    preferredPackageId,
  );
  const previewOnlyTopup = checkoutEnabled !== true;
  const installmentLabel = getInstallmentLabel(seriesType);
  const installmentSuffix = installmentNumber ? ` ${installmentNumber}` : "";
  const installmentLabelLower = installmentLabel.toLowerCase();
  const primaryButtonLabel = getPrimaryButtonLabel({
    isSignedIn,
    insufficient,
    busyAction,
    previewOnlyTopup,
  });

  useEffect(() => {
    if (!open || view !== "packs") {
      return;
    }

    let cancelled = false;
    setIsLoadingPackages(true);
    setPackagesUsingFallback(false);

    fetchTopupCatalogSnapshot()
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        const livePackages = buildDisplayPackages(snapshot?.packages);
        if (livePackages.length > 0) {
          setPackages(livePackages);
          return;
        }

        setPackages(fallbackPackages);
        setPackagesUsingFallback(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setPackages(fallbackPackages);
        setPackagesUsingFallback(true);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPackages(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackPackages, open, view]);

  useEffect(() => {
    if (!open) {
      setPackages(fallbackPackages);
      setPackagesUsingFallback(false);
      setIsLoadingPackages(false);
    }
  }, [fallbackPackages, open]);

  if (!open) {
    return null;
  }

  const handlePrimaryAction = () => {
    if (busyAction) {
      return;
    }

    if (insufficient) {
      if (previewOnlyTopup) {
        onOpenStore?.();
        return;
      }
      onViewChange?.("packs");
      return;
    }

    onConfirmUnlock?.();
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-black/82 p-3 backdrop-blur-[6px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Unlock ${installmentLabelLower}${installmentSuffix}`}
        className="relative w-full max-w-[32rem] overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(21,18,31,0.98)_0%,rgba(14,12,20,0.98)_100%)] text-white shadow-[0_28px_80px_rgba(6,5,16,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-[rgba(255,255,255,0.035)] text-[#ffd6e5] shadow-[0_16px_34px_rgba(8,6,20,0.22)]">
                {view === "packs" ? (
                  <Wallet size={20} />
                ) : (
                  <LockKeyhole size={20} />
                )}
              </div>
              <div>
                <p className="inline-flex rounded-full border border-[rgba(255,79,154,0.22)] bg-[rgba(255,79,154,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6e5]">
                  {view === "packs" ? "More points" : "Unlock"}
                </p>
                <p className="mt-3 text-sm text-white/70">
                  {view === "packs"
                    ? previewOnlyTopup
                      ? "Point packs stay in preview while checkout is disabled."
                      : "Pick a pack."
                    : "Unlock stays on this account after checkout."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`${storefrontBadgeClass} min-h-[40px] min-w-[40px] justify-center px-0 py-0 text-white`}
              aria-label="Close unlock modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="relative p-5 sm:p-6">
          {view === "confirm" ? (
            <div className="mt-6">
              <h2 className="font-display text-[1.9rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                Unlock {installmentLabel}
                {installmentSuffix} for{" "}
                <span className="text-[#ffd6e5]">
                  {formatUSNumber(resolvedPrice)}
                </span>{" "}
                Points
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/72">
                {!isSignedIn
                  ? "Sign in to unlock"
                  : insufficient
                    ? `Need ${formatUSNumber(computedShortfall)} more points.`
                    : "Unlocks right away."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className={`${storefrontInfoCardClass} px-4 text-white`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
                    Your balance
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                    {isSignedIn ? formatUSNumber(resolvedWalletBalance) : "--"}
                  </p>
                  <p className="mt-1 text-xs text-white/62">
                    {isSignedIn
                      ? "Points ready to use."
                      : "Sign in for balance."}
                  </p>
                </div>
                <div className={`${storefrontInfoCardClass} px-4 text-white`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
                    {installmentLabel} price
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                    <span className="text-[#f4c95d]">
                      {formatUSNumber(resolvedPrice)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-white/62">
                    {insufficient
                      ? `Need ${formatUSNumber(computedShortfall)} more points.`
                      : "Used when you confirm."}
                  </p>
                </div>
              </div>

              <div className={`mt-5 ${storefrontNoticeClass}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-cyan-300/10 text-cyan-100">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-[0.16em] text-white/68">
                      Quick note
                    </p>
                    <p className="mt-1 text-xs leading-6 text-white/62">
                      Point options stay in USD and on this account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={Boolean(busyAction)}
                  className={`px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${storefrontSecondaryButtonClass}`}
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={Boolean(busyAction)}
                  className={`px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass}`}
                >
                  {primaryButtonLabel}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[1.9rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                    Get points
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-white/72">
                    {previewOnlyTopup
                      ? "Point packs are preview-only while checkout stays off."
                      : `Add a pack to unlock ${installmentLabel}${installmentSuffix}.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onViewChange?.("confirm")}
                  disabled={Boolean(busyAction)}
                  className={`inline-flex min-h-[40px] items-center gap-2 px-3.5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${storefrontSecondaryButtonClass}`}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              </div>

              <div className={`mt-5 ${storefrontNoticeClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <span>
                    {previewOnlyTopup
                      ? "Point packs are not live yet"
                      : `Need ${formatUSNumber(computedShortfall)} more points`}
                  </span>
                  <span className="rounded-full border border-amber-200/18 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                    {previewOnlyTopup ? "Preview only" : "Secure checkout"}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {packages.map((pkg) => {
                  const isHighlighted = pkg.id === highlightPackageId;
                  const currentPackAction = `topup:${pkg.id}`;
                  const bonusLabel =
                    pkg.bonusPts > 0
                      ? `${formatUSNumber(pkg.paidPts)} + ${formatUSNumber(pkg.bonusPts)} bonus`
                      : `${formatUSNumber(pkg.paidPts)} points`;

                  return (
                    <div
                      key={pkg.id}
                      className={`px-4 text-white transition-all ${
                        isHighlighted
                          ? `${storefrontInfoCardClass} border-[rgba(255,79,154,0.24)] bg-[rgba(255,79,154,0.08)]`
                          : storefrontSoftCardClass
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold tracking-[-0.03em] text-white">
                              {pkg.name}
                            </span>
                            {pkg.tag ? (
                              <span className={`${storefrontAccentChipClass} min-h-0 gap-1 px-2.5 py-1 text-[10px] tracking-[0.18em] text-amber-100`}>
                                <Sparkles size={10} />
                                {pkg.tag}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                            {pkg.priceLabel} for {formatUSNumber(pkg.totalPts)}{" "}
                            Points
                          </p>
                          <p className="mt-1 text-xs text-white/62">
                            {bonusLabel}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (previewOnlyTopup) {
                              onOpenStore?.();
                              return;
                            }
                            onBuyPack?.(pkg.id);
                          }}
                          disabled={Boolean(busyAction)}
                          className={`min-h-[44px] px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass}`}
                        >
                          {busyAction === currentPackAction
                            ? "Buying..."
                            : previewOnlyTopup
                              ? "Preview"
                              : "Buy"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`mt-5 ${storefrontNoticeClass}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-cyan-300/10 text-cyan-100">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-[0.16em] text-white/68">
                      Checkout
                    </p>
                    <p className="mt-1 text-xs leading-6 text-white/62">
                      {previewOnlyTopup
                        ? "Checkout is disabled in this environment. Open the store preview instead."
                        : packagesUsingFallback
                        ? "Showing current pack defaults."
                        : "USD pricing. Points land on this account after purchase."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={Boolean(busyAction)}
                  className={`px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${storefrontSecondaryButtonClass}`}
                >
                  Close
                </button>
                {onOpenStore ? (
                  <button
                    type="button"
                    onClick={onOpenStore}
                    disabled={Boolean(busyAction)}
                    className={`px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${storefrontSecondaryButtonClass}`}
                  >
                    Store
                  </button>
                ) : null}
                <span className={`${storefrontBadgeClass} px-5 py-2.5 text-sm tracking-[0.12em] text-white/62`}>
                  {isLoadingPackages ? "Refreshing..." : "Point options"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
