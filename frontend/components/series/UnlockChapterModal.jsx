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
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

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

function getPrimaryButtonLabel({ isSignedIn, insufficient, busyAction }) {
  if (busyAction === "unlock") {
    return "Unlocking...";
  }
  if (!isSignedIn) {
    return "Sign in";
  }
  if (insufficient) {
    return "Get points";
  }
  return "Unlock";
}

export default function UnlockChapterModal({
  open,
  chapterNumber,
  pricePts = 0,
  walletBalance = 0,
  shortfallPts = 0,
  isSignedIn = false,
  view = "confirm",
  busyAction = "",
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
  const chapterSuffix = chapterNumber ? ` ${chapterNumber}` : "";
  const primaryButtonLabel = getPrimaryButtonLabel({
    isSignedIn,
    insufficient,
    busyAction,
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
        aria-label={`Unlock chapter${chapterSuffix}`}
        className="relative w-full max-w-[32rem] overflow-hidden rounded-[32px] border-2 border-white/20 bg-black/95 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b-2 border-white/10 bg-black/80 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-black bg-[#FFE500] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {view === "packs" ? (
                  <Wallet size={20} />
                ) : (
                  <LockKeyhole size={20} />
                )}
              </div>
              <div>
                <p className="inline-flex rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  {view === "packs" ? "More points" : "Unlock"}
                </p>
                <p className="mt-3 text-sm font-semibold text-white/80">
                  {view === "packs"
                    ? "Pick a pack."
                    : "Unlock stays on this account after checkout."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border-2 border-black bg-[#FF007A] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5"
              aria-label="Close unlock modal"
            >
              <X size={18} />
            </button>
          </div>

        </div>

        <div className="relative p-5 sm:p-6">
          {view === "confirm" ? (
            <div className="mt-6">
              <h2 className="text-[1.9rem] font-black uppercase tracking-[0.04em] text-white">
                Unlock Chapter{chapterSuffix} for{" "}
                <span className="text-[#00E5FF]">{formatUSNumber(resolvedPrice)}</span>{" "}
                Points
              </h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-white/80">
                {!isSignedIn
                  ? "Sign in to unlock"
                  : insufficient
                    ? `Need ${formatUSNumber(computedShortfall)} more points.`
                    : "Unlocks right away."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border-2 border-white/20 bg-black px-4 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
                    Your balance
                  </p>
                  <p className="mt-2 text-2xl font-black uppercase tracking-[0.03em] text-white">
                    {isSignedIn ? formatUSNumber(resolvedWalletBalance) : "--"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white/70">
                    {isSignedIn
                      ? "Points ready to use."
                      : "Sign in for balance."}
                  </p>
                </div>
                <div className="rounded-[24px] border-2 border-white/20 bg-black px-4 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
                    Chapter price
                  </p>
                  <p className="mt-2 text-2xl font-black uppercase tracking-[0.03em] text-white">
                    <span className="text-[#FFE500]">
                      {formatUSNumber(resolvedPrice)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white/70">
                    {insufficient
                      ? `Need ${formatUSNumber(computedShortfall)} more points.`
                      : "Used when you confirm."}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border-2 border-white/20 bg-black px-4 py-4 text-sm text-white/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#00E5FF] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-[0.05em] text-white">
                      Quick note
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-6 text-white/70">
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
                  <h2 className="text-[1.9rem] font-black uppercase tracking-[0.04em] text-white">
                    Get points
                  </h2>
                  <p className="mt-3 text-sm font-semibold leading-7 text-white/80">
                    Add a pack to unlock Chapter{chapterSuffix}.
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

              <div className="mt-5 rounded-[22px] border-2 border-white/20 bg-black px-4 py-3 text-sm font-semibold text-white/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    Need {formatUSNumber(computedShortfall)} more points
                  </span>
                  <span className="rounded-full border-2 border-black bg-[#FFE500] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    Secure checkout
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
                      className={`rounded-[24px] border-2 px-4 py-4 transition shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
                        isHighlighted
                          ? "border-[#00E5FF] bg-[#101010]"
                          : "border-white/20 bg-black"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black uppercase tracking-[0.03em] text-white">
                              {pkg.name}
                            </span>
                            {pkg.tag ? (
                              <span className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-[#FFE500] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <Sparkles size={10} />
                                {pkg.tag}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-2xl font-black uppercase tracking-[0.03em] text-white">
                            {pkg.priceLabel} for {formatUSNumber(pkg.totalPts)}{" "}
                            Points
                          </p>
                          <p className="mt-1 text-xs font-semibold text-white/70">
                            {bonusLabel}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onBuyPack?.(pkg.id)}
                          disabled={Boolean(busyAction)}
                          className={`min-h-[42px] px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass}`}
                        >
                          {busyAction === currentPackAction
                            ? "Buying..."
                            : "Buy"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-[24px] border-2 border-white/20 bg-black px-4 py-4 text-sm text-white/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#00E5FF] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-[0.05em] text-white">
                      Checkout
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-6 text-white/70">
                      {packagesUsingFallback
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
                <span className="inline-flex items-center justify-center rounded-full border-2 border-white/20 bg-black px-5 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-white/75 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
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
