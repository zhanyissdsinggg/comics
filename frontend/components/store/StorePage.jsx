"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EditorialHero from "../common/EditorialHero";
import NetworkFallback from "../common/NetworkFallback";
import SurfacePanel from "../common/SurfacePanel";
import PackageCard from "./PackageCard";
import { useWalletStore } from "../../store/useWalletStore";
import { useCouponStore } from "../../store/useCouponStore";
import { useAuthStore } from "../../store/useAuthStore";
import { trackEvent } from "../../lib/trackEvent";
import {
  POINTS_PACKS,
  OFFERS,
  SUBSCRIPTION_OFFERS,
} from "../../lib/offers/catalog";
import { getRegionConfig } from "../../lib/region/config";
import { getCookie } from "../../lib/cookies";
import { apiGet } from "../../lib/apiClient";
import { getFriendlyMessage } from "../../lib/errorMessages";
import { fetchTopupCatalogSnapshot } from "../../lib/topupCatalog";
import {
  formatUSDisplayCurrency,
  formatUSDisplayCurrencyFromCents,
  formatUSNumber,
} from "../../lib/localization";
import {
  buildPathWithAttribution,
  mergePaymentAttribution,
  readPaymentAttributionFromSearchParams,
} from "../../lib/paymentAttribution";
import { resolvePlanCatalog } from "../../lib/subscriptions";
import { persistCommerceSuccess } from "../../lib/commerceSuccess";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import { getSearchParam, toURLSearchParams } from "../../lib/pageSearchParams";
import { buildSupportPath } from "../../lib/supportRouting";
import { resolvePublicCommerceMode } from "../../lib/storefrontBillingState";
import { siteConfig } from "../../lib/siteConfig";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

const PromoBanner = dynamic(() => import("./PromoBanner"));

function openAuthPrompt() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("auth:open"));
}

function getReturnLabel(returnTo, sourceEntry) {
  if (/^\/(read|series)\//.test(returnTo) || sourceEntry.includes("READER")) {
    return "Back";
  }
  if (returnTo.startsWith("/library")) {
    return "Library";
  }
  if (returnTo.startsWith("/account")) {
    return "Account";
  }
  if (returnTo.startsWith("/search")) {
    return "Search";
  }
  if (returnTo.startsWith("/rankings")) {
    return "Rankings";
  }
  if (returnTo.startsWith("/subscribe")) {
    return "Plans";
  }
  return "Browse";
}

const PACKAGE_FIT_GUIDE = {
  starter: "A few chapters.",
  medium: "Weekly reading.",
  value: "Read more, spend less.",
  mega: "Big reading weeks.",
};

function formatPriceLabel(amount, currency = "USD") {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "";
  }

  return formatUSDisplayCurrencyFromCents(numericAmount, currency);
}

function scrollToSection(id) {
  if (typeof document === "undefined") {
    return;
  }

  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const [retryPackageId, setRetryPackageId] = useState("");
  const [region, setRegion] = useState("us");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [promotions, setPromotions] = useState([]);
  const [topupCatalog, setTopupCatalog] = useState(
    Array.isArray(initialTopupCatalog) ? initialTopupCatalog : [],
  );
  const [billingAvailability, setBillingAvailability] = useState(
    initialBillingAvailability,
  );
  const [isNewPayer, setIsNewPayer] = useState(true);
  const routeSearchParams = useMemo(
    () => toURLSearchParams(initialSearchParams),
    [initialSearchParams],
  );
  const planCatalog = useMemo(
    () => resolvePlanCatalog(initialPlanCatalog),
    [initialPlanCatalog],
  );

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
  const sourcePath = routeAttribution?.sourcePath || "/store";
  const isSubscriber = Boolean(subscription?.active);
  const returnLabel = getReturnLabel(returnTo, sourceEntry);
  const launchAccessLabel = isSignedIn ? "Account" : "Sign in";
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
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("mn_region")
        : null;
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
      const list = Array.isArray(response.data?.promotions)
        ? response.data.promotions
        : [];
      setPromotions(
        list.filter((promo) =>
          ["FIRST_PURCHASE", "HOLIDAY", "RETURNING"].includes(promo.type),
        ),
      );
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
    const plans = Object.values(planCatalog);
    if (!plans.length) {
      return null;
    }

    return {
      maxDiscount: plans.reduce(
        (max, plan) => Math.max(max, plan.discountPct || 0),
        0,
      ),
      maxDailyFree: plans.reduce(
        (max, plan) => Math.max(max, plan.dailyFreeUnlocks || 0),
        0,
      ),
      bestTtf: plans.reduce(
        (best, plan) =>
          plan.ttfMultiplier && plan.ttfMultiplier < best
            ? plan.ttfMultiplier
            : best,
        1,
      ),
    };
  }, [planCatalog]);

  const membershipStartingPrice = useMemo(() => {
    const plans = Object.values(planCatalog).filter(
      (plan) => plan && typeof plan === "object",
    );
    if (plans.length > 0) {
      const cheapestPlan = [...plans].sort(
        (left, right) =>
          Number(left?.price || Infinity) - Number(right?.price || Infinity),
      )[0];
      if (cheapestPlan?.price !== undefined && cheapestPlan?.price !== null) {
        return formatPriceLabel(
          cheapestPlan.price,
          cheapestPlan.currency || "USD",
        );
      }
    }
    return SUBSCRIPTION_OFFERS[0]?.price?.replace("/mo", "") || "";
  }, [planCatalog]);

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

  const purchaseMode = resolvePublicCommerceMode(
    billingAvailability,
    "purchaseActionsEnabled",
  );
  const purchaseActionsEnabled =
    purchaseMode.isRealCommerceLive &&
    siteConfig.monetization.checkoutEnabled &&
    siteConfig.monetization.pointPacksEnabled;
  const purchasePrelaunch =
    purchaseMode.isPrelaunch ||
    !siteConfig.monetization.checkoutEnabled ||
    !siteConfig.monetization.pointPacksEnabled;
  const membershipVisible = siteConfig.monetization.membershipEnabled;
  const ordersVisible = siteConfig.monetization.checkoutEnabled;
  const purchaseAvailabilityLabel = purchaseActionsEnabled
    ? "Live"
    : "Unavailable";
  const packageComparisonRows = useMemo(
    () =>
      orderedPackages.map((pkg) => {
        const totalPts = Number(pkg.paidPts || 0) + Number(pkg.bonusPts || 0);
        const bonusPct = pkg.paidPts
          ? Math.round(
              (Number(pkg.bonusPts || 0) / Number(pkg.paidPts || 1)) * 100,
            )
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
    setErrorMessage("");
    setRetryPackageId("");

    if (!isSignedIn) {
      setErrorMessage("Sign in to buy points.");
      openAuthPrompt();
      return;
    }

    if (!purchaseActionsEnabled) {
      setErrorMessage("Point packs are not available right now.");
      return;
    }

    const selectedPackage = orderedPackages.find(
      (item) => item.id === packageId,
    );
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
      setRetryPackageId("");
      return;
    }

    if (response.status === 401) {
      setErrorMessage("Sign in to buy points.");
      setRetryPackageId("");
      openAuthPrompt();
      return;
    }

    setRetryPackageId(packageId);
    setErrorMessage(
      getFriendlyMessage(
        response.error,
        response.message || "Top up failed.",
      ),
    );
  };

  const retryFailedPurchase = useCallback(() => {
    if (!retryPackageId || busyId) {
      return;
    }
    void handleBuy(retryPackageId);
  }, [busyId, retryPackageId]);

  const handleClaim = async () => {
    const code = couponCode.trim();
    if (!code) {
      return;
    }

    if (!isSignedIn) {
      setCouponMessage("Sign in to redeem.");
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

    trackEvent("coupon_claim_fail", {
      code,
      status: response.status,
      errorCode: response.error,
    });
    setCouponMessage(
      response.data?.message || response.error || "Invalid coupon.",
    );
  };

  const regionConfig = getRegionConfig(region);
  const storeHeroStats = useMemo(
    () =>
      [
        purchaseActionsEnabled
          ? {
              label: "Availability",
              value: purchaseAvailabilityLabel,
              hint: "Checkout is live.",
            }
          : null,
        {
          label: "Model",
          value: "One-time packs",
          hint: isSubscriber ? "Separate from plans." : "One-time.",
        },
        membershipVisible
          ? {
              label: "Plans",
              value: membershipStartingPrice
                ? `${membershipStartingPrice}/mo`
                : "Monthly option",
              hint: subscriptionStats
                ? `Up to ${subscriptionStats.maxDiscount}% off chapters.`
                : "Monthly option.",
            }
          : null,
      ].filter(Boolean),
    [
      purchaseAvailabilityLabel,
      isSubscriber,
      membershipStartingPrice,
      purchaseActionsEnabled,
      subscriptionStats,
    ],
  );

  const secondaryButtonClass =
    `${storefrontSecondaryButtonClass} min-h-[48px] px-5 py-3 text-[11px] tracking-[0.08em]`;
  const primaryButtonClass =
    `${storefrontPrimaryButtonClass} min-h-[48px] px-5 py-3 text-[11px] tracking-[0.08em]`;
  const fieldClass =
    "flex-1 rounded-full border-2 border-white/20 bg-[#080808] px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-white outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE500]";
  const quietCardClass =
    "rounded-[24px] border-2 border-black bg-[#0b0b0b] px-4 py-4 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";
  const compareShellClass =
    "overflow-hidden rounded-[30px] border-2 border-black bg-[#0b0b0b] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";
  const packCountLabel = `${orderedPackages.length} ${orderedPackages.length === 1 ? "pack" : "packs"}`;

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            eyebrow="Point packs"
            title={
              purchaseActionsEnabled ? "Points." : "Points."
            }
            description={
              purchaseActionsEnabled
                ? "Pick a pack."
                : "Point packs are not available right now."
            }
            secondary={purchaseActionsEnabled ? regionConfig.label : ""}
            stats={storeHeroStats}
            accent="blue"
            appearance="dark"
          />

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="dark"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
                Store
              </p>
              <div>
                <h2 className="font-display text-[1.9rem] font-black uppercase tracking-[-0.05em] text-white">
                  {purchaseActionsEnabled ? "Point packs" : "Point packs"}
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={
                  purchaseActionsEnabled
                    ? () => scrollToSection("point-packs")
                    : handleLaunchAccess
                }
                className={primaryButtonClass}
              >
                {purchaseActionsEnabled ? "See packs" : launchAccessLabel}
              </button>
              {subscriptionStats && membershipVisible ? (
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
            </div>
          </SurfacePanel>
        </section>

        {errorMessage ? (
          retryPackageId ? (
            <NetworkFallback
              compact
              className="px-0 py-0"
              cardClassName="max-w-none rounded-[28px] px-5 py-5 sm:px-6 sm:py-6"
              title="Checkout hit a snag."
              description={errorMessage}
              onRetry={retryFailedPurchase}
            >
              <button
                type="button"
                onClick={() =>
                  router.push(
                    buildSupportPath({
                      topic: "billing",
                      context: `Store top-up issue on ${retryPackageId}`,
                    }),
                  )
                }
                className={secondaryButtonClass}
              >
                Support
              </button>
            </NetworkFallback>
          ) : (
            <SurfacePanel tone="danger" appearance="dark" accent="pink">
              <p className="text-sm font-semibold text-white">{errorMessage}</p>
            </SurfacePanel>
          )
        ) : null}

        <SurfacePanel className="space-y-5" appearance="dark" accent="blue" tone="muted">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
                Store
              </p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
                {purchaseActionsEnabled ? "Store" : "Store"}
              </h2>
            </div>
          </div>

          {!purchaseActionsEnabled ? (
            <div className={quietCardClass}>
                <h3 className="text-xl font-black uppercase tracking-[-0.05em] text-white">
                  Point packs unavailable
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
                Point-pack checkout is not available right now.
                </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      buildSupportPath({
                        topic: "billing",
                        context: "Point-pack checkout is unavailable.",
                      }),
                    )
                  }
                  className={secondaryButtonClass}
                >
                  Support
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                label: "Now",
                detail: purchaseActionsEnabled
                  ? "Buy what you need."
                  : "Unavailable right now.",
              },
              {
                label: "Orders",
                detail: ordersVisible && purchaseActionsEnabled
                  ? "Past charges are in Orders."
                  : "Available after launch.",
              },
              {
                label: "Help",
                detail: "Billing help.",
              },
            ].map((item) => (
              <div key={item.label} className={quietCardClass}>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <p className="text-sm font-black uppercase tracking-[0.04em] text-white">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold leading-6 text-white/75">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                router.push(
                  buildSupportPath({
                    topic: "billing",
                    context: "Point-pack launch or billing question",
                  }),
                )
              }
              className={secondaryButtonClass}
            >
              Support
            </button>
            {ordersVisible ? (
              <button
                type="button"
                onClick={() => router.push("/orders")}
                className={secondaryButtonClass}
              >
                Orders
              </button>
            ) : null}
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
              <SurfacePanel
                className="space-y-4"
                appearance="light"
                accent="blue"
              >
                <div>
                  <h2 className="font-display text-2xl font-black uppercase tracking-[-0.05em] text-black">
                    Sign in
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={openAuthPrompt}
                  className={primaryButtonClass}
                >
                  {purchaseActionsEnabled ? "Sign in" : "Sign in"}
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                  onClick={() => router.push("/rankings?type=ttf&window=all")}
                  className={secondaryButtonClass}
                >
                    Trending
                  </button>
                  {membershipVisible ? (
                    <button
                      type="button"
                      onClick={() => router.push("/subscribe")}
                      className={secondaryButtonClass}
                    >
                      Plans
                    </button>
                  ) : null}
                </div>
              </SurfacePanel>
            ) : null}

            <SurfacePanel
              className="space-y-4"
              appearance="dark"
              accent="blue"
              tone="muted"
            >
                <div>
                  <h2 className="font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
                    Reading
                  </h2>
                </div>
              <div className="grid gap-3">
                <div className={quietCardClass}>
                  <p className="text-sm font-black uppercase tracking-[0.04em] text-white">
                    Point packs
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
                    Buy once.
                  </p>
                </div>
                {membershipVisible ? (
                  <div className={quietCardClass}>
                    <p className="text-sm font-black uppercase tracking-[0.04em] text-white">
                      Plans
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
                      {subscriptionStats
                        ? `From ${membershipStartingPrice || "current price"} a month. Up to ${subscriptionStats.maxDiscount}% off.`
                        : "Monthly plans."}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {membershipVisible ? (
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
                ) : null}
                {purchaseActionsEnabled && ordersVisible ? (
                  <button
                    type="button"
                    onClick={() => router.push("/orders")}
                    className={secondaryButtonClass}
                  >
                    Orders
                  </button>
                ) : null}
              </div>
            </SurfacePanel>

            {purchaseActionsEnabled ? (
              <SurfacePanel
                id="wallet-codes"
                className="space-y-4"
                appearance="dark"
                accent="blue"
                tone="muted"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
                      Codes
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
                      Redeem code
                    </h2>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-white/65">
                    {coupons.length} available
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="Code"
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={handleClaim}
                    className={secondaryButtonClass}
                  >
                    {isSignedIn ? "Redeem" : "Sign in"}
                  </button>
                </div>
                {couponMessage ? (
                  <p className="text-xs font-semibold text-white/80">{couponMessage}</p>
                ) : null}
                {coupons.length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/65">
                    {coupons.map((coupon) => (
                      <span
                        key={coupon.id}
                        className="rounded-full border-2 border-black bg-[#0b0b0b] px-3 py-1 font-black uppercase tracking-[0.1em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      >
                        {coupon.label || coupon.code}
                      </span>
                    ))}
                  </div>
                ) : null}
              </SurfacePanel>
            ) : (
              <SurfacePanel
                id="wallet-codes"
                className="space-y-4"
                appearance="dark"
                accent="blue"
                tone="muted"
              >
                <div>
                  <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
                    Codes
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
                      router.push(
                        buildSupportPath({
                          topic: "billing",
                          context: "Promo code or launch code question",
                        }),
                      )
                    }
                    className={secondaryButtonClass}
                  >
                    Support
                  </button>
                </div>
              </SurfacePanel>
            )}
          </div>

          <SurfacePanel
            id="point-packs"
            className="space-y-5"
            appearance="dark"
            accent="blue"
            tone="muted"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
                  {purchaseActionsEnabled ? "Choose a pack" : "Packs"}
                </h2>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/65">
                {packCountLabel}
              </p>
            </div>

            {packageComparisonRows.length > 0 ? (
              <details className={compareShellClass}>
                <summary className="cursor-pointer list-none px-4 py-4 text-sm font-black uppercase tracking-[0.06em] text-white">
                  Pack info
                </summary>
                <div className="border-t-2 border-black px-4 py-4">
                  <div className="space-y-3 md:hidden">
                    {packageComparisonRows.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="rounded-[20px] border-2 border-black bg-[#0b0b0b] px-4 py-4 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black uppercase tracking-[0.04em] text-white">
                            {pkg.name}
                          </p>
                          <span className="text-sm font-black uppercase tracking-[0.04em] text-white">
                            {pkg.priceLabel}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm font-semibold text-white/75">
                          <p>{formatUSNumber(pkg.totalPts)} total points</p>
                          <p>{pkg.bonusLabel}</p>
                          <p>{pkg.bestFor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-black text-left text-white/70">
                          <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">
                            Pack
                          </th>
                          <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">
                            Price
                          </th>
                          <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">
                            Total points
                          </th>
                          <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">
                            Bonus
                          </th>
                          <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">
                            Fit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-black bg-[#0b0b0b]">
                        {packageComparisonRows.map((pkg) => (
                          <tr key={pkg.id}>
                            <td className="px-4 py-3 font-black uppercase tracking-[0.04em] text-white">
                              {pkg.name}
                            </td>
                            <td className="px-4 py-3 font-semibold text-white/75">
                              {pkg.priceLabel}
                            </td>
                            <td className="px-4 py-3 font-semibold text-white/75">
                              {formatUSNumber(pkg.totalPts)} pts
                            </td>
                            <td className="px-4 py-3 font-semibold text-white/75">
                              {pkg.bonusLabel}
                            </td>
                            <td className="px-4 py-3 font-semibold text-white/75">
                              {pkg.bestFor}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {orderedPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={busyId === pkg.id ? "opacity-70" : ""}
                >
                  <PackageCard
                    pkg={pkg}
                    highlighted={pkg.id === focusId}
                    onSelect={handleBuy}
                    disabled={!purchaseActionsEnabled}
                    hideAction={purchasePrelaunch}
                    statusLabel=""
                    statusNote=""
                    ctaLabel={
                      isSignedIn ? "Get this pack" : "Sign in"
                    }
                  />
                </div>
              ))}
            </div>

            {purchaseActionsEnabled ? (
              <div className="flex flex-wrap gap-3">
                {ordersVisible ? (
                  <button
                    type="button"
                    onClick={() => router.push("/orders")}
                    className={secondaryButtonClass}
                  >
                    Orders
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      buildSupportPath({
                        topic: "billing",
                        context: "Point-pack purchase history help",
                      }),
                    )
                  }
                  className={secondaryButtonClass}
                >
                  Support
                </button>
              </div>
            ) : null}
          </SurfacePanel>
        </div>
      </main>
    </div>
  );
}
