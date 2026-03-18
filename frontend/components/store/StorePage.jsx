"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import PackageCard from "./PackageCard";
import { useWalletStore } from "../../store/useWalletStore";
import { useCouponStore } from "../../store/useCouponStore";
import { useAuthStore } from "../../store/useAuthStore";
import { trackEvent } from "../../lib/trackEvent";
import { POINTS_PACKS, OFFERS } from "../../lib/offers/catalog";
import { getRegionConfig } from "../../lib/region/config";
import { getCookie } from "../../lib/cookies";
import { apiGet } from "../../lib/apiClient";
import { getFriendlyMessage } from "../../lib/errorMessages";
import { fetchTopupCatalogSnapshot } from "../../lib/topupCatalog";
import { formatUSNumber } from "../../lib/localization";
import {
  buildPathWithAttribution,
  mergePaymentAttribution,
  readPaymentAttributionFromSearchParams,
} from "../../lib/paymentAttribution";
import { getPlanCatalog } from "../../lib/subscriptions";
import { persistCommerceSuccess } from "../../lib/commerceSuccess";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";

const PromoBanner = dynamic(() => import("./PromoBanner"));

function openAuthPrompt() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("auth:open"));
}

function getReturnLabel(returnTo, sourceEntry) {
  if (/^\/(read|series)\//.test(returnTo) || sourceEntry.includes("READER")) {
    return "Back to reading";
  }
  if (returnTo.startsWith("/library")) {
    return "Back to library";
  }
  if (returnTo.startsWith("/account")) {
    return "Back to account";
  }
  if (returnTo.startsWith("/search")) {
    return "Back to search";
  }
  if (returnTo.startsWith("/rankings")) {
    return "Back to rankings";
  }
  if (returnTo.startsWith("/subscribe")) {
    return "Back to membership";
  }
  return "Back to browse";
}

export default function StorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { topup, paidPts, bonusPts, subscription } = useWalletStore();
  const { coupons, loadCoupons, claimCoupon } = useCouponStore();
  const { isSignedIn } = useAuthStore();
  const [busyId, setBusyId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [region, setRegion] = useState("global");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [promotions, setPromotions] = useState([]);
  const [topupCatalog, setTopupCatalog] = useState([]);
  const [billingAvailability, setBillingAvailability] = useState(null);
  const [isNewPayer, setIsNewPayer] = useState(true);

  const returnTo = searchParams.get("returnTo") || "/";
  const focus = searchParams.get("focus") || "";
  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(searchParams),
    [searchParams],
  );
  const promotionId = routeAttribution?.promotionId || "";
  const campaignId = routeAttribution?.campaignId || "";
  const sourceEntry = routeAttribution?.entryPoint || "STORE_ENTRY";
  const sourceSeriesId = routeAttribution?.sourceSeriesId || "";
  const sourceEpisodeId = routeAttribution?.sourceEpisodeId || "";
  const sourcePath = routeAttribution?.sourcePath || returnTo || "/store";
  const isSubscriber = Boolean(subscription?.active);
  const returnLabel = getReturnLabel(returnTo, sourceEntry);

  useEffect(() => {
    trackEvent("store_view", {
      focus,
      entry: sourceEntry,
      promotionId: promotionId || undefined,
      campaignId: campaignId || undefined,
    });
  }, [campaignId, focus, promotionId, sourceEntry]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("mn_region") : null;
    const cookieRegion = getCookie("mn_region");
    setRegion(stored || cookieRegion || "global");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setIsNewPayer(window.localStorage.getItem("mn_has_purchased") !== "1");
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      loadCoupons();
    }
  }, [isSignedIn, loadCoupons]);

  useEffect(() => {
    let mounted = true;
    apiGet("/api/promotions").then((response) => {
      if (!mounted || !response.ok) {
        return;
      }
      const list = Array.isArray(response.data?.promotions) ? response.data.promotions : [];
      setPromotions(list.filter((promo) => ["FIRST_PURCHASE", "HOLIDAY", "RETURNING"].includes(promo.type)));
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchTopupCatalogSnapshot()
      .then(({ packages, billing }) => {
        if (mounted) {
          setTopupCatalog(packages);
          setBillingAvailability(billing || null);
        }
      })
      .catch(() => {
        if (mounted) {
          setTopupCatalog([]);
          setBillingAvailability(null);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const subscriptionStats = useMemo(() => {
    const plans = Object.values(getPlanCatalog() || {});
    if (!plans.length) {
      return null;
    }

    return {
      maxDiscount: plans.reduce((max, plan) => Math.max(max, plan.discountPct || 0), 0),
      maxDailyFree: plans.reduce((max, plan) => Math.max(max, plan.dailyFreeUnlocks || 0), 0),
      bestTtf: plans.reduce(
        (best, plan) => (plan.ttfMultiplier && plan.ttfMultiplier < best ? plan.ttfMultiplier : best),
        1,
      ),
    };
  }, []);

  const focusId = useMemo(() => {
    if (focus && focus !== "auto") {
      return focus;
    }
    return "starter";
  }, [focus]);

  useEffect(() => {
    if (!focusId) {
      return;
    }
    trackEvent("offer_impression", {
      offerId: `points_pack_${focusId}`,
      entry: sourceEntry,
      promotionId: promotionId || undefined,
    });
  }, [focusId, promotionId, sourceEntry]);

  const orderedPackages = useMemo(() => {
    const packageMap = {};
    topupCatalog.forEach((pkg) => {
      const key = pkg.packageId || pkg.id;
      if (key) {
        packageMap[key] = pkg;
      }
    });

    const packages = POINTS_PACKS.map((item) => {
      const id = item.id.replace("points_pack_", "");
      const backend = packageMap[item.id] || packageMap[id] || null;
      const currency = backend?.currency || "USD";
      const price = backend?.price ?? null;
      return {
        id,
        name: backend?.label || item.name,
        paidPts: backend?.paidPts ?? item.paidPts,
        bonusPts: backend?.bonusPts ?? item.bonusPts,
        tag: backend?.tags?.[0] || item.tag,
        price,
        priceLabel:
          price !== null && price !== undefined
            ? `${currency} ${Number(price).toFixed(2)}`
            : getRegionConfig(region).pointsPackages?.[id]?.priceLabel || "",
      };
    });

    if (!focusId) {
      return packages;
    }

    const selected = packages.find((pkg) => pkg.id === focusId);
    if (!selected) {
      return packages;
    }

    return [selected, ...packages.filter((pkg) => pkg.id !== focusId)];
  }, [focusId, region, topupCatalog]);

  const purchaseActionsEnabled = billingAvailability?.purchaseActionsEnabled === true;
  const purchasePreviewOnly = billingAvailability?.purchaseActionsEnabled === false;
  const packageDecisionSummary = useMemo(() => {
    if (!orderedPackages.length) {
      return null;
    }

    return orderedPackages.reduce(
      (summary, pkg) => {
        const totalPts = Number(pkg.paidPts || 0) + Number(pkg.bonusPts || 0);
        const price = Number(pkg.price || 0);
        const bonusPct = pkg.paidPts ? Math.round((Number(pkg.bonusPts || 0) / Number(pkg.paidPts || 1)) * 100) : 0;

        if (!summary.cheapest || (price > 0 && price < Number(summary.cheapest.price || 0))) {
          summary.cheapest = pkg;
        }
        if (!summary.largest || totalPts > summary.largest.totalPts) {
          summary.largest = { ...pkg, totalPts };
        }
        if (!summary.highestBonus || Number(pkg.bonusPts || 0) > Number(summary.highestBonus.bonusPts || 0)) {
          summary.highestBonus = { ...pkg, bonusPct };
        }

        return summary;
      },
      { cheapest: null, largest: null, highestBonus: null },
    );
  }, [orderedPackages]);

  const handleBuy = async (packageId) => {
    if (!isSignedIn) {
      setErrorMessage("Sign in to buy points and keep them on your account.");
      openAuthPrompt();
      return;
    }

    if (!purchaseActionsEnabled) {
      setErrorMessage(
        "You can compare packs here right now. Buying will open once checkout is live.",
      );
      return;
    }

    const selectedPackage = orderedPackages.find((item) => item.id === packageId);
    const attribution = mergePaymentAttribution(routeAttribution, {
      promotionId: promotionId || undefined,
      offerId: `points_pack_${packageId}`,
      entryPoint: sourceEntry,
      campaignId: campaignId || undefined,
      sourcePath,
      sourceSeriesId: sourceSeriesId || undefined,
      sourceEpisodeId: sourceEpisodeId || undefined,
      returnTo,
    });

    setBusyId(packageId);
    trackEvent("package_click", { packageId, entry: sourceEntry });
    trackEvent("offer_click", {
      offerId: `points_pack_${packageId}`,
      entry: sourceEntry,
      promotionId: promotionId || undefined,
    });

    const response = await topup(packageId, {
      expectedAmount: selectedPackage?.price,
      attribution,
    });

    setBusyId(null);
    if (response.ok) {
      trackEvent("offer_purchase_success", {
        offerId: `points_pack_${packageId}`,
        entry: sourceEntry,
        orderId: response.data?.order?.orderId,
      });
      persistCommerceSuccess({
        kind: "topup",
        packageId,
        packageLabel: selectedPackage?.name,
        paidPts: selectedPackage?.paidPts,
        bonusPts: selectedPackage?.bonusPts,
        orderId: response.data?.order?.orderId,
        entryPoint: sourceEntry || undefined,
        targetPath: returnTo,
      });
      router.replace(returnTo);
      setErrorMessage("");
      return;
    }

    if (response.status === 401) {
      setErrorMessage("Sign in to buy points and keep them on your account.");
      openAuthPrompt();
      return;
    }

    setErrorMessage(getFriendlyMessage(response.error, response.message || "Top up failed. Please try again."));
  };

  const handleClaim = async () => {
    const code = couponCode.trim();
    if (!code) {
      return;
    }

    if (!isSignedIn) {
      setCouponMessage("Sign in to redeem codes on your account.");
      openAuthPrompt();
      return;
    }

    const response = await claimCoupon(code);
    if (response.ok) {
      trackEvent("coupon_claim", { code });
      setCouponMessage("Code applied.");
      setCouponCode("");
      return;
    }

    trackEvent("coupon_claim_fail", { code, status: response.status, errorCode: response.error });
    setCouponMessage(response.data?.message || response.error || "Invalid coupon.");
  };

  const regionConfig = getRegionConfig(region);
  const storeHeroStats = useMemo(
    () => [
      {
        label: "Balance",
        value: `${(paidPts + bonusPts).toLocaleString()} pts`,
        hint: `Paid ${paidPts.toLocaleString()} - Bonus ${bonusPts.toLocaleString()}`,
      },
      {
        label: "Reading style",
        value: isSubscriber ? "Member" : "Points",
        hint: isSubscriber
          ? "Membership is already active."
          : "Buy packs when you want flexibility.",
      },
      {
        label: "Coupons",
        value: coupons.length.toLocaleString(),
        hint: isSignedIn
          ? "Saved on your account."
          : "Sign in before redeeming codes.",
      },
      {
        label: "Offers",
        value: (promotions.length > 0 ? promotions.length : isNewPayer ? 1 : 0).toLocaleString(),
        hint: `${regionConfig.label} pricing`,
      },
    ],
    [bonusPts, coupons.length, isNewPayer, isSignedIn, isSubscriber, paidPts, promotions.length, regionConfig.label],
  );

  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800";
  const fieldClass =
    "flex-1 rounded-full border border-black/8 bg-white px-4 py-2 text-xs text-slate-700 outline-none transition focus:border-[var(--gush-accent,#2f6bff)] focus:ring-2 focus:ring-[rgba(47,107,255,0.12)]";

  return (
    <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <main className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Point packs"
          title="Top up once. Keep reading."
          description={
            purchasePreviewOnly
              ? "Look through the live pack lineup now. Buying opens here once checkout is ready."
              : "Pick the pack that fits your reading pace and jump back into the story."
          }
          secondary={
            purchasePreviewOnly
              ? `${regionConfig.label} pricing | preview only`
              : `${regionConfig.label} pricing | ${regionConfig.taxHint}`
          }
          stats={storeHeroStats}
          appearance="light"
          actions={
            <>
              {subscriptionStats ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      buildPathWithAttribution("/subscribe", {
                        promotionId: promotionId || undefined,
                        campaignId: campaignId || undefined,
                        entryPoint: "STORE_UPSELL",
                        sourcePath,
                        sourceSeriesId: sourceSeriesId || undefined,
                        sourceEpisodeId: sourceEpisodeId || undefined,
                        returnTo,
                      }),
                    )
                  }
                  className={primaryButtonClass}
                >
                  {STOREFRONT_TERMS.compareMembership}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => router.push(returnTo)}
                className={secondaryButtonClass}
              >
                {returnLabel}
              </button>
            </>
          }
        />

        {errorMessage ? (
          <SurfacePanel tone="danger" appearance="light" accent="rose">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </SurfacePanel>
        ) : null}

        {purchasePreviewOnly ? (
          <SurfacePanel tone="warning" appearance="light" accent="amber">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-700">Checkout coming soon</p>
                <p className="text-sm text-amber-700/80">
                  You can look through the packs now. Buying opens here once checkout is ready.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/support")}
                className={secondaryButtonClass}
              >
                Contact support
              </button>
            </div>
          </SurfacePanel>
        ) : null}

        {promotions.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {promotions.map((promo) => (
              <PromoBanner key={promo.id} promotion={promo} />
            ))}
          </div>
        ) : isNewPayer ? (
          <PromoBanner offer={OFFERS.first_purchase_bonus} />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
          <div className="space-y-6">
            {!isSignedIn ? (
              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Sign in
                  </p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Sign in before you buy or redeem a code.
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Points, codes, and purchase history should stay attached to one account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAuthPrompt}
                  className={primaryButtonClass}
                >
                  Sign in
                </button>
              </SurfacePanel>
            ) : null}

            <SurfacePanel className="space-y-3" appearance="light" accent="blue">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Regional pricing
              </p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                Know the price before you buy.
              </h2>
              <p className="text-sm leading-6 text-slate-600">{regionConfig.taxHint}</p>
            </SurfacePanel>

            {subscriptionStats ? (
              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Weekly reader?
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Membership fits better if you read all the time.
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  Get up to {subscriptionStats.maxDiscount}% off unlocks, up to {subscriptionStats.maxDailyFree} free reads a day, and shorter wait timers.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      buildPathWithAttribution("/subscribe", {
                        promotionId: promotionId || undefined,
                        campaignId: campaignId || undefined,
                        entryPoint: "STORE_UPSELL",
                        sourcePath,
                        sourceSeriesId: sourceSeriesId || undefined,
                        sourceEpisodeId: sourceEpisodeId || undefined,
                        returnTo,
                      }),
                    )
                  }
                  className={secondaryButtonClass}
                >
                  {STOREFRONT_TERMS.compareMembership}
                </button>
              </SurfacePanel>
            ) : null}

            <SurfacePanel id="wallet-codes" className="space-y-4" appearance="light" accent="blue">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Codes
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Redeem a code
                  </h2>
                </div>
                <span className="text-xs text-slate-500">{coupons.length} available</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Enter your code"
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={handleClaim}
                  className={secondaryButtonClass}
                >
                  {isSignedIn ? "Redeem" : "Sign in to redeem"}
                </button>
              </div>
              {couponMessage ? <p className="text-xs text-slate-500">{couponMessage}</p> : null}
              {coupons.length > 0 ? (
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-600">
                  {coupons.map((coupon) => (
                    <span key={coupon.id} className="rounded-full border border-black/8 bg-white/84 px-3 py-1">
                      {coupon.label || coupon.code}
                    </span>
                  ))}
                </div>
              ) : null}
            </SurfacePanel>
          </div>

          <SurfacePanel id="point-packs" className="space-y-5" appearance="light" accent="blue">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Point packs
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Pick a pack.
                </h2>
              </div>
              <p className="text-xs text-slate-500">{orderedPackages.length} packs</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {orderedPackages.map((pkg) => (
                <div key={pkg.id} className={busyId === pkg.id ? "opacity-70" : ""}>
                  <PackageCard
                    pkg={pkg}
                    highlighted={pkg.id === focusId}
                    onSelect={handleBuy}
                    disabled={!purchaseActionsEnabled}
                    ctaLabel={
                      !purchaseActionsEnabled
                        ? "Coming soon"
                        : isSignedIn
                          ? "Get this pack"
                          : "Sign in to get it"
                    }
                  />
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Pick your rhythm
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                One-time packs or a monthly plan.
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Choose points if you dip in and out. Choose membership if you read every week.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-[24px] border border-black/6 bg-white/84 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Points packs
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Better for casual reading
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Buy points when you want to read at your own pace without a monthly charge.
              </p>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <p>
                  Entry pack:{" "}
                  <span className="text-slate-950">
                    {packageDecisionSummary?.cheapest?.name || "Starter"}
                    {packageDecisionSummary?.cheapest?.priceLabel
                      ? ` | ${packageDecisionSummary.cheapest.priceLabel}`
                      : ""}
                  </span>
                </p>
                <p>
                  Largest pack:{" "}
                  <span className="text-slate-950">
                    {packageDecisionSummary?.largest
                      ? `${packageDecisionSummary.largest.name} | ${formatUSNumber(packageDecisionSummary.largest.totalPts)} pts`
                      : "Catalog unavailable"}
                  </span>
                </p>
                <p>
                  Best bonus:{" "}
                  <span className="text-slate-950">
                    {packageDecisionSummary?.highestBonus
                      ? `${packageDecisionSummary.highestBonus.name} | ${packageDecisionSummary.highestBonus.bonusPct}% extra`
                      : "Catalog unavailable"}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-black/6 bg-white/84 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Membership
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Better for regular reading
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Membership makes more sense if you read often and want lower unlock prices every week.
              </p>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <p>
                  Unlock savings:{" "}
                  <span className="text-slate-950">
                    Up to {subscriptionStats?.maxDiscount ?? 0}% off locked chapters
                  </span>
                </p>
                <p>
                  Free reads:{" "}
                  <span className="text-slate-950">
                    Up to {subscriptionStats?.maxDailyFree ?? 0} each day
                  </span>
                </p>
                <p>
                  Wait time:{" "}
                  <span className="text-slate-950">
                    As low as {subscriptionStats ? Math.round(subscriptionStats.bestTtf * 100) : 100}% of the normal timer
                  </span>
                </p>
              </div>
              {subscriptionStats ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      buildPathWithAttribution("/subscribe", {
                        promotionId: promotionId || undefined,
                        campaignId: campaignId || undefined,
                        entryPoint: "STORE_VALUE_COMPARE",
                        sourcePath,
                        sourceSeriesId: sourceSeriesId || undefined,
                        sourceEpisodeId: sourceEpisodeId || undefined,
                        returnTo,
                      }),
                    )
                  }
                  className="mt-5 rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                >
                  {STOREFRONT_TERMS.compareMembership}
                </button>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-black/6 bg-white/84 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Need receipts or help?
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
                The support stuff is easy to find later.
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>Points stay on the signed-in account.</li>
                <li>Purchases keeps your receipts in one place.</li>
                <li>Support is there if a billing issue needs someone to step in.</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className={primaryButtonClass}
                >
                  View purchases
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/support")}
                  className={secondaryButtonClass}
                >
                  {STOREFRONT_TERMS.billingSupport}
                </button>
              </div>
            </div>
          </div>
        </SurfacePanel>
      </main>
    </div>
  );
}


