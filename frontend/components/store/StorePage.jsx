"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import PackageCard from "./PackageCard";
import { useWalletStore } from "../../store/useWalletStore";
import { useCouponStore } from "../../store/useCouponStore";
import { useAuthStore } from "../../store/useAuthStore";
import { trackEvent } from "../../lib/trackEvent";
import { POINTS_PACKS, OFFERS, SUBSCRIPTION_OFFERS } from "../../lib/offers/catalog";
import { getRegionConfig } from "../../lib/region/config";
import { getCookie } from "../../lib/cookies";
import { apiGet } from "../../lib/apiClient";
import { getFriendlyMessage } from "../../lib/errorMessages";
import { fetchTopupCatalogSnapshot } from "../../lib/topupCatalog";
import { formatUSCurrency, formatUSNumber } from "../../lib/localization";
import {
  buildPathWithAttribution,
  mergePaymentAttribution,
  readPaymentAttributionFromSearchParams,
} from "../../lib/paymentAttribution";
import { SUBSCRIPTION_PLANS } from "../../lib/subscriptions";
import { persistCommerceSuccess } from "../../lib/commerceSuccess";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import { getSearchParam, toURLSearchParams } from "../../lib/pageSearchParams";
import { buildSupportPath } from "../../lib/supportRouting";
import { resolvePublicCommerceMode } from "../../lib/storefrontBillingState";

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

const PACKAGE_FIT_GUIDE = {
  starter: "Trying the site or unlocking a few chapters.",
  medium: "Following one or two series each week.",
  value: "Regular weekly reading with a better bonus.",
  mega: "Heavy unlocking across multiple series.",
};

function formatPriceLabel(amount, currency = "USD") {
  const numericAmount = Number(amount);
  const normalizedCurrency = String(currency || "USD").toUpperCase();

  if (!Number.isFinite(numericAmount)) {
    return "";
  }

  if (normalizedCurrency === "USD") {
    return formatUSCurrency(numericAmount);
  }

  return `${normalizedCurrency} ${numericAmount.toFixed(2)}`;
}

function scrollToSection(id) {
  if (typeof document === "undefined") {
    return;
  }

  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function StorePage({
  initialSearchParams = {},
  initialTopupCatalog = [],
  initialBillingAvailability = null,
  initialPlanCatalog = null,
}) {
  const router = useRouter();
  const { topup, paidPts, bonusPts, subscription } = useWalletStore();
  const { coupons, loadCoupons, claimCoupon } = useCouponStore();
  const { isSignedIn } = useAuthStore();
  const [busyId, setBusyId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [region, setRegion] = useState("us");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [promotions, setPromotions] = useState([]);
  const [topupCatalog, setTopupCatalog] = useState(Array.isArray(initialTopupCatalog) ? initialTopupCatalog : []);
  const [billingAvailability, setBillingAvailability] = useState(initialBillingAvailability);
  const [isNewPayer, setIsNewPayer] = useState(true);
  const routeSearchParams = useMemo(() => toURLSearchParams(initialSearchParams), [initialSearchParams]);

  const returnTo = getSearchParam(initialSearchParams, "returnTo", "/");
  const focus = getSearchParam(initialSearchParams, "focus");
  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(routeSearchParams),
    [routeSearchParams],
  );
  const promotionId = routeAttribution?.promotionId || "";
  const campaignId = routeAttribution?.campaignId || "";
  const sourceEntry = routeAttribution?.entryPoint || "STORE_ENTRY";
  const sourceSeriesId = routeAttribution?.sourceSeriesId || "";
  const sourceEpisodeId = routeAttribution?.sourceEpisodeId || "";
  const sourcePath = routeAttribution?.sourcePath || returnTo || "/store";
  const isSubscriber = Boolean(subscription?.active);
  const returnLabel = getReturnLabel(returnTo, sourceEntry);
  const launchAccessLabel = isSignedIn ? "Open account" : "Sign in for launch access";
  const handleLaunchAccess = () => {
    if (isSignedIn) {
      router.push("/account");
      return;
    }
    openAuthPrompt();
  };

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
    setRegion(stored || cookieRegion || "us");
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
    const plans = Object.values(initialPlanCatalog || SUBSCRIPTION_PLANS || {});
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

  const membershipStartingPrice = useMemo(() => {
    const plans = Object.values(initialPlanCatalog || SUBSCRIPTION_PLANS || {}).filter(
      (plan) => plan && typeof plan === "object",
    );
    if (plans.length > 0) {
      const cheapestPlan = [...plans].sort(
        (left, right) => Number(left?.price || Infinity) - Number(right?.price || Infinity),
      )[0];
      if (cheapestPlan?.price !== undefined && cheapestPlan?.price !== null) {
        return formatPriceLabel(cheapestPlan.price, cheapestPlan.currency || "USD");
      }
    }
    return SUBSCRIPTION_OFFERS[0]?.price?.replace("/mo", "") || "";
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
            ? formatPriceLabel(price, currency)
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

  const purchaseMode = resolvePublicCommerceMode(billingAvailability, "purchaseActionsEnabled");
  const purchaseActionsEnabled = purchaseMode.isRealCommerceLive;
  const purchasePrelaunch = purchaseMode.isPrelaunch;
  const purchaseAvailabilityLabel = purchaseActionsEnabled
    ? "Buy now"
    : "Prelaunch";
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
  const packageComparisonRows = useMemo(
    () =>
      orderedPackages.map((pkg) => {
        const totalPts = Number(pkg.paidPts || 0) + Number(pkg.bonusPts || 0);
        const bonusPct = pkg.paidPts
          ? Math.round((Number(pkg.bonusPts || 0) / Number(pkg.paidPts || 1)) * 100)
          : 0;

        return {
          id: pkg.id,
          name: pkg.name,
          priceLabel: pkg.priceLabel || "Shown at checkout",
          totalPts,
          bonusLabel: bonusPct > 0 ? `${bonusPct}% extra` : "No bonus",
          bestFor: PACKAGE_FIT_GUIDE[pkg.id] || "Flexible one-time reading.",
        };
      }),
    [orderedPackages],
  );
  const handleBuy = async (packageId) => {
    if (!isSignedIn) {
      setErrorMessage("Sign in to buy points and keep them on your account.");
      openAuthPrompt();
      return;
    }

    if (!purchaseActionsEnabled) {
      setErrorMessage(
        "Point-pack checkout is not open yet. Sign in for launch access, compare membership, or contact billing support.",
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
        label: "Availability",
        value: purchaseAvailabilityLabel,
        hint: purchaseActionsEnabled ? "Checkout is open." : "",
      },
      {
        label: "Model",
        value: "One-time packs",
        hint: isSubscriber ? "Separate from membership." : "One-time only.",
      },
      {
        label: "Membership",
        value: membershipStartingPrice ? `${membershipStartingPrice}/mo` : "Monthly option",
        hint: subscriptionStats
          ? `Up to ${subscriptionStats.maxDiscount}% off unlocks.`
          : "Recurring monthly option.",
      },
    ],
    [
      purchaseAvailabilityLabel,
      isSubscriber,
      membershipStartingPrice,
      purchaseActionsEnabled,
      subscriptionStats,
    ],
  );

  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800";
  const fieldClass =
    "flex-1 rounded-full border border-black/8 bg-white px-4 py-2 text-xs text-slate-700 outline-none transition focus:border-[var(--gush-accent,#2f6bff)] focus:ring-2 focus:ring-[rgba(47,107,255,0.12)]";
  const packCountLabel = `${orderedPackages.length} ${orderedPackages.length === 1 ? "pack" : "packs"}`;

  return (
    <div className="gush-page-shell">
      <div className="gush-page-ambient" />
      <SiteHeader variant="light" />
      <main className="gush-page-main gush-section-stack">
        <EditorialHero
          eyebrow="Point packs"
          title={purchaseActionsEnabled ? "Buy points for one-time unlocks." : "Compare point packs before launch."}
          description={
            purchaseActionsEnabled
              ? "Use packs for one-time unlocks. Use membership if you read often."
              : "Launch pricing and point totals are visible now."
          }
          secondary={
            purchaseActionsEnabled ? regionConfig.label : "No charge today"
          }
          stats={storeHeroStats}
          appearance="light"
          actions={
            <>
              <button
                type="button"
                onClick={purchaseActionsEnabled ? () => scrollToSection("point-packs") : handleLaunchAccess}
                className={primaryButtonClass}
              >
                {purchaseActionsEnabled ? "Buy point packs" : launchAccessLabel}
              </button>
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
                  className={secondaryButtonClass}
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

        {purchasePrelaunch ? (
          <SurfacePanel tone="warning" appearance="light" accent="amber" className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-700">Prelaunch</p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                Checkout opens later.
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-amber-700/85">
                Review launch pricing now. No charge starts today. Purchases and receipts appear in Purchases after launch.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleLaunchAccess}
                className={secondaryButtonClass}
              >
                {launchAccessLabel}
              </button>
              <button
                type="button"
                onClick={() => router.push("/rankings?type=ttf&window=all")}
                className={secondaryButtonClass}
              >
                Browse free starts
              </button>
              <button
                type="button"
                onClick={() => router.push("/subscribe")}
                className={secondaryButtonClass}
              >
                Compare membership
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(buildSupportPath({ topic: "billing", context: "Point-pack launch or billing question" }))
                }
                className={secondaryButtonClass}
              >
                Billing help
              </button>
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                How paying works
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Choose points or membership.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">Point packs stay one-time. Membership stays monthly.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                eyebrow: "Free start",
                title: "Some series start free",
                description: "Use free first chapters to test the hook before you spend anything.",
              },
              {
                eyebrow: packageDecisionSummary?.cheapest?.priceLabel || "Points packs",
                title: "Use points on locked episodes",
                description: packageDecisionSummary?.largest
                  ? `The biggest pack currently gives ${formatUSNumber(packageDecisionSummary.largest.totalPts)} total points.`
                  : "Buy a pack once, then spend points only when you unlock locked episodes.",
              },
              {
                eyebrow: membershipStartingPrice ? `${membershipStartingPrice}/month` : "Membership",
                title: "Membership is monthly and recurring",
                description: subscriptionStats
                  ? `Better for regular readers: up to ${subscriptionStats.maxDiscount}% off unlocks and up to ${subscriptionStats.maxDailyFree} free reads a day.`
                  : "Choose membership if you read often and want a lower cost per unlock.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-black/6 bg-white/88 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  {item.eyebrow}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </SurfacePanel>

        {purchaseActionsEnabled && promotions.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {promotions.map((promo) => (
              <PromoBanner key={promo.id} promotion={promo} />
            ))}
          </div>
        ) : purchaseActionsEnabled && isNewPayer ? (
          <PromoBanner offer={OFFERS.first_purchase_bonus} />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
          <div className="space-y-6">
            {!isSignedIn ? (
              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {purchaseActionsEnabled ? "Sign in" : "Launch access"}
                  </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  {purchaseActionsEnabled
                    ? "Sign in before you buy or redeem a code."
                    : "Sign in once for launch access."}
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  {purchaseActionsEnabled
                    ? "Keep purchases, codes, and receipts on one account."
                    : "Future packs and receipts stay on that account."}
                </p>
              </div>
                <button
                  type="button"
                  onClick={openAuthPrompt}
                  className={primaryButtonClass}
                >
                  {purchaseActionsEnabled ? "Sign in" : "Sign in for launch access"}
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/rankings?type=ttf&window=all")}
                    className={secondaryButtonClass}
                  >
                    Browse free starts
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/subscribe")}
                    className={secondaryButtonClass}
                  >
                    Compare membership
                  </button>
                </div>
              </SurfacePanel>
            ) : null}

            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Compare the models
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Keep packs and membership separate.
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  Packs stay one-time. Membership stays monthly.
                </p>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[24px] border border-black/8 bg-[#f8f9fc] px-4 py-4">
                  <p className="text-sm font-semibold text-slate-950">
                    {purchaseActionsEnabled ? "Local total stays visible" : "Pricing stays visible"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {purchaseActionsEnabled
                      ? `Pack cards show the current regional price before checkout.`
                      : `Pack cards show the launch price up front.`}
                  </p>
                </div>
                <div className="rounded-[24px] border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] px-4 py-4">
                  <p className="text-sm font-semibold text-slate-950">Membership is the monthly alternative</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {subscriptionStats
                      ? `Starts around ${membershipStartingPrice || "the current plan price"} a month and can save up to ${subscriptionStats.maxDiscount}%.`
                      : "Compare membership if repeated top-ups start feeling heavier than one monthly plan."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      buildPathWithAttribution("/subscribe", {
                        promotionId: promotionId || undefined,
                        campaignId: campaignId || undefined,
                        entryPoint: "STORE_SIDEBAR_COMPARE",
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
                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className={secondaryButtonClass}
                >
                  {purchaseActionsEnabled ? "View purchases" : "Receipt location"}
                </button>
              </div>
            </SurfacePanel>

            {purchaseActionsEnabled ? (
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
            ) : (
              <SurfacePanel id="wallet-codes" className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Promo codes
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Save promo or creator codes for launch.
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleLaunchAccess}
                    className={secondaryButtonClass}
                  >
                    {launchAccessLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(buildSupportPath({ topic: "billing", context: "Promo code or launch code question" }))
                    }
                    className={secondaryButtonClass}
                  >
                    Ask about a code
                  </button>
                </div>
              </SurfacePanel>
            )}
          </div>

          <SurfacePanel id="point-packs" className="space-y-5" appearance="light" accent="blue">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Point packs
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  {purchaseActionsEnabled
                    ? "Choose a point pack, then unlock chapters as you go."
                    : "Compare point packs."}
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {packCountLabel}
              </p>
            </div>

            {packageComparisonRows.length > 0 ? (
              <>
                <details className="overflow-hidden rounded-[26px] border border-black/8 bg-[#f8f9fc] md:hidden">
                  <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-slate-950">
                    Compare pack details
                  </summary>
                  <div className="space-y-3 border-t border-black/8 px-4 py-4">
                    {packageComparisonRows.map((pkg) => (
                      <div key={pkg.id} className="rounded-[20px] border border-black/8 bg-white px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-950">{pkg.name}</p>
                          <span className="text-sm font-semibold text-slate-950">{pkg.priceLabel}</span>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-slate-600">
                          <p>{formatUSNumber(pkg.totalPts)} total points</p>
                          <p>{pkg.bonusLabel}</p>
                          <p>{pkg.bestFor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
                <div className="hidden overflow-hidden rounded-[26px] border border-black/8 bg-[#f8f9fc] md:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-black/8 text-left text-slate-500">
                          <th className="px-4 py-3 font-semibold">Pack</th>
                          <th className="px-4 py-3 font-semibold">Price</th>
                          <th className="px-4 py-3 font-semibold">Total points</th>
                          <th className="px-4 py-3 font-semibold">Bonus</th>
                          <th className="px-4 py-3 font-semibold">Best for</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/8 bg-white/84">
                        {packageComparisonRows.map((pkg) => (
                          <tr key={pkg.id}>
                            <td className="px-4 py-3 font-semibold text-slate-950">{pkg.name}</td>
                            <td className="px-4 py-3 text-slate-600">{pkg.priceLabel}</td>
                            <td className="px-4 py-3 text-slate-600">{formatUSNumber(pkg.totalPts)} pts</td>
                            <td className="px-4 py-3 text-slate-600">{pkg.bonusLabel}</td>
                            <td className="px-4 py-3 text-slate-600">{pkg.bestFor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {orderedPackages.map((pkg) => (
                <div key={pkg.id} className={busyId === pkg.id ? "opacity-70" : ""}>
                  <PackageCard
                    pkg={pkg}
                    highlighted={pkg.id === focusId}
                    onSelect={handleBuy}
                    disabled={!purchaseActionsEnabled}
                    hideAction={purchasePrelaunch}
                    statusLabel=""
                    statusNote={
                      purchaseActionsEnabled
                        ? "Receipts and charges appear in Purchases after checkout."
                        : ""
                    }
                    ctaLabel={
                      isSignedIn
                        ? "Get this pack"
                        : "Sign in to get it"
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/orders")}
                className={secondaryButtonClass}
              >
                {purchaseActionsEnabled ? "View purchases" : "Receipt location"}
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(buildSupportPath({ topic: "billing", context: "Point-pack purchase history help" }))
                }
                className={secondaryButtonClass}
              >
                Get billing help
              </button>
            </div>
          </SurfacePanel>
        </div>
      </main>
    </div>
  );
}


