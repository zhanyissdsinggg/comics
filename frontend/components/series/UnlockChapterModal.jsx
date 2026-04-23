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
  formatUSDisplayCurrency,
  formatUSNumber,
} from "../../lib/localization";
import { getRegionConfig } from "../../lib/region/config";
import { fetchTopupCatalogSnapshot } from "../../lib/topupCatalog";

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
    return formatUSDisplayCurrency(price, pkg?.currency);
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
    return "Sign in to unlock";
  }
  if (insufficient) {
    return "Get More Points";
  }
  return "Unlock Now";
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
        aria-label={`Unlock Chapter${chapterSuffix}`}
        className="relative w-full max-w-[32rem] overflow-hidden border-[4px] border-black bg-white text-black shadow-[14px_14px_0_0_rgba(255,0,122,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b-[4px] border-black bg-[#ffe500] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center border-[3px] border-black bg-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                {view === "packs" ? (
                  <Wallet size={20} />
                ) : (
                  <LockKeyhole size={20} />
                )}
              </div>
              <div>
                <p className="inline-flex -rotate-1 border-[2px] border-black bg-black px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#ffe500]">
                  {view === "packs" ? "More points" : "Secure unlock"}
                </p>
                <p className="mt-3 text-sm font-bold text-black/62">
                  {view === "packs"
                    ? "Pick a pack and keep reading."
                    : "Unlock stays on this account after checkout."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center border-[3px] border-black bg-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ff007a] hover:text-white hover:shadow-none"
              aria-label="Close unlock modal"
            >
              <X size={18} />
            </button>
          </div>

        </div>

        <div className="relative p-5 sm:p-6">
          {view === "confirm" ? (
            <div className="mt-6">
              <h2 className="text-[1.9rem] font-black uppercase tracking-[0.04em] text-black">
                Unlock Chapter{chapterSuffix} for{" "}
                {formatUSNumber(resolvedPrice)} Points
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/68">
                {!isSignedIn
                  ? "Sign in to use points, unlock this chapter, and keep your reading progress on one account."
                  : insufficient
                    ? `You are ${formatUSNumber(computedShortfall)} points short right now.`
                    : "Your unlock will be applied instantly after confirmation."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="border-[3px] border-black bg-white px-4 py-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                    Your balance
                  </p>
                  <p className="mt-2 text-2xl font-black uppercase tracking-[0.03em] text-black">
                    {isSignedIn ? formatUSNumber(resolvedWalletBalance) : "--"}
                  </p>
                  <p className="mt-1 text-xs text-black/55">
                    {isSignedIn
                      ? "Available points on this account."
                      : "Sign in to view your points balance."}
                  </p>
                </div>
                <div className="border-[3px] border-black bg-[#fff7cf] px-4 py-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                    Chapter price
                  </p>
                  <p className="mt-2 text-2xl font-black uppercase tracking-[0.03em] text-black">
                    {formatUSNumber(resolvedPrice)}
                  </p>
                  <p className="mt-1 text-xs text-black/55">
                    {insufficient
                      ? `${formatUSNumber(computedShortfall)} more points needed.`
                      : "Charged in points after you confirm."}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-[3px] border-black bg-[#eefcff] px-4 py-4 text-sm text-black/78">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center border-[2px] border-black bg-[#ffe500] text-black">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-[0.05em] text-black">Secure unlock</p>
                    <p className="mt-1 text-xs leading-6 text-black/60">
                      Point options are shown in USD and stay tied to your
                      current account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={Boolean(busyAction)}
                  className="border-[3px] border-black bg-white px-4 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#eefcff] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={Boolean(busyAction)}
                  className="border-[3px] border-black bg-[#ff007a] px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#e1006d] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {primaryButtonLabel}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[1.9rem] font-black uppercase tracking-[0.04em] text-black">
                    Get More Points
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-black/68">
                    Add a pack to unlock Chapter{chapterSuffix}. Prices are
                    shown in US dollars.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onViewChange?.("confirm")}
                  disabled={Boolean(busyAction)}
                  className="inline-flex min-h-[40px] items-center gap-2 border-[3px] border-black bg-white px-3.5 py-2 text-sm font-black uppercase tracking-[0.05em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#eefcff] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              </div>

              <div className="mt-5 border-[3px] border-black bg-[#fff7cf] px-4 py-3 text-sm text-black/76">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    Need {formatUSNumber(computedShortfall)} more points
                  </span>
                  <span className="border-[2px] border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-black/68">
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
                      className={`border-[3px] px-4 py-4 transition ${
                        isHighlighted
                          ? "border-black bg-[#ffe500] shadow-[5px_5px_0_0_rgba(0,0,0,1)]"
                          : "border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black uppercase tracking-[0.03em] text-black">
                              {pkg.name}
                            </span>
                            {pkg.tag ? (
                              <span className="inline-flex items-center gap-1 border-[2px] border-black bg-[#fff1f7] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
                                <Sparkles size={10} />
                                {pkg.tag}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-2xl font-black uppercase tracking-[0.03em] text-black">
                            {pkg.priceLabel} for {formatUSNumber(pkg.totalPts)}{" "}
                            Points
                          </p>
                          <p className="mt-1 text-xs text-black/55">
                            {bonusLabel}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onBuyPack?.(pkg.id)}
                          disabled={Boolean(busyAction)}
                          className="min-h-[42px] border-[3px] border-black bg-white px-4 py-2.5 text-sm font-black uppercase tracking-[0.05em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#eefcff] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
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

              <div className="mt-5 border-[3px] border-black bg-[#eefcff] px-4 py-4 text-sm text-black/72">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center border-[2px] border-black bg-[#ffe500] text-black">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-[0.05em] text-black">
                      Safe to check out
                    </p>
                    <p className="mt-1 text-xs leading-6 text-black/58">
                      {packagesUsingFallback
                        ? "Showing current pack defaults while live pricing refreshes."
                        : "USD pricing is ready here, and your points land on the same account after purchase."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={Boolean(busyAction)}
                  className="border-[3px] border-black bg-white px-4 py-2.5 text-sm font-black uppercase tracking-[0.05em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#eefcff] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Close
                </button>
                {onOpenStore ? (
                  <button
                    type="button"
                    onClick={onOpenStore}
                    disabled={Boolean(busyAction)}
                    className="border-[3px] border-black bg-white px-4 py-2.5 text-sm font-black uppercase tracking-[0.05em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#eefcff] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    View all options
                  </button>
                ) : null}
                <span className="inline-flex items-center justify-center border-[3px] border-black bg-[#00e5ff] px-5 py-2.5 text-sm font-black uppercase tracking-[0.05em] text-black">
                  {isLoadingPackages ? "Refreshing prices..." : "Point options"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
