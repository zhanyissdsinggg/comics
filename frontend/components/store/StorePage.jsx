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
      setErrorMessage("Sign in to buy points and keep your wallet synced across devices.");
      openAuthPrompt();
      return;
    }

    if (!purchaseActionsEnabled) {
      setErrorMessage(
        "Checkout is temporarily unavailable while secure billing is being configured. You can still review packages here.",
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
      setErrorMessage("Sign in to buy points and keep your wallet synced across devices.");
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
      setCouponMessage("Sign in to redeem coupons and keep them synced to your wallet.");
      openAuthPrompt();
      return;
    }

    const response = await claimCoupon(code);
    if (response.ok) {
      trackEvent("coupon_claim", { code });
      setCouponMessage("Coupon applied to your wallet.");
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
        label: "Mode",
        value: isSubscriber ? "Subscriber" : "Standard",
        hint: isSubscriber
          ? "Membership perks are already active on this wallet."
          : "Upgrade to cut unlock costs and add daily free reads.",
      },
      {
        label: "Coupons",
        value: coupons.length.toLocaleString(),
        hint: isSignedIn
          ? "Stored to the signed-in account wallet."
          : "Sign in before redeeming wallet codes.",
      },
      {
        label: "Promos",
        value: (promotions.length > 0 ? promotions.length : isNewPayer ? 1 : 0).toLocaleString(),
        hint: `${regionConfig.label} pricing - tax rules applied at checkout`,
      },
    ],
    [bonusPts, coupons.length, isNewPayer, isSignedIn, isSubscriber, paidPts, promotions.length, regionConfig.label],
  );

  const secondaryButtonClass =
    "rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10";
  const fieldClass =
    "flex-1 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs text-neutral-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";

  return (
    <div className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Points store"
          title="Buy points with clear pricing and fewer checkout surprises."
          description={
            purchasePreviewOnly
              ? "Review live point-pack pricing, coupons, and regional tax notes in one place while checkout is temporarily unavailable."
              : "Balance, coupons, promotions, and point packs stay in one place, with checkout ready when you are."
          }
          secondary={
            purchasePreviewOnly
              ? `${regionConfig.label} pricing - checkout preview only right now`
              : `${regionConfig.label} pricing - ${regionConfig.taxHint}`
          }
          stats={storeHeroStats}
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
                  className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
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
          <SurfacePanel className="border border-red-500/40 bg-red-500/10 text-red-100">
            <p className="text-sm">{errorMessage}</p>
          </SurfacePanel>
        ) : null}

        {purchasePreviewOnly ? (
          <SurfacePanel className="border border-amber-500/30 bg-amber-500/10 text-amber-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Checkout preview only</p>
                <p className="text-sm text-amber-100/85">
                  Package pricing is live, but purchase actions stay disabled until secure billing is fully enabled.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/support")}
                className={secondaryButtonClass}
              >
                Open support
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
              <SurfacePanel className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                    Account gate
                  </p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                    Sign in before you top up or redeem wallet codes.
                  </h2>
                  <p className="text-sm leading-6 text-neutral-400">
                    Purchases, coupons, and balance changes should land on a real account, not a disposable session.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAuthPrompt}
                  className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  Sign in
                </button>
              </SurfacePanel>
            ) : null}

            <SurfacePanel className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Tax and region
              </p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                Checkout policy snapshot
              </h2>
              <p className="text-sm leading-6 text-neutral-400">{regionConfig.taxHint}</p>
            </SurfacePanel>

            {subscriptionStats ? (
              <SurfacePanel className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Membership upsell
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                  Subscriber savings
                </h2>
                <p className="text-sm leading-6 text-neutral-400">
                  Save up to {subscriptionStats.maxDiscount}% on unlocks, receive up to {subscriptionStats.maxDailyFree} daily free episodes, and cut free-unlock wait times down to {Math.round(subscriptionStats.bestTtf * 100)}% of the standard timer.
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

            <SurfacePanel className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                    Coupons
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                    Redeem wallet codes
                  </h2>
                </div>
                <span className="text-xs text-neutral-500">{coupons.length} available</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Enter wallet or coupon code"
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
              {couponMessage ? <p className="text-xs text-neutral-400">{couponMessage}</p> : null}
              {coupons.length > 0 ? (
                <div className="flex flex-wrap gap-2 text-[10px] text-neutral-300">
                  {coupons.map((coupon) => (
                    <span key={coupon.id} className="rounded-full border border-white/10 bg-black/10 px-3 py-1">
                      {coupon.label || coupon.code}
                    </span>
                  ))}
                </div>
              ) : null}
            </SurfacePanel>
          </div>

          <SurfacePanel className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Point packs
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  Pick a pack with the featured offer already surfaced.
                </h2>
              </div>
              <p className="text-xs text-neutral-500">{orderedPackages.length} packages available</p>
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
                        ? "Checkout coming soon"
                        : isSignedIn
                          ? "Buy points"
                          : "Sign in to buy"
                    }
                  />
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>

        <SurfacePanel className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Buying guide
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                Choose points, membership, and support paths with less guesswork.
              </h2>
            </div>
            <p className="text-xs text-neutral-500">
              This page should answer value, delivery, and support questions before checkout starts.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-black/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                Points packs
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                Best for selective spending
              </h3>
              <p className="mt-3 text-sm leading-6 text-neutral-300">
                Buy points when you want one-off unlocks, promo flexibility, or a wallet that does not auto-renew.
              </p>
              <div className="mt-4 space-y-2 text-sm text-neutral-400">
                <p>
                  Entry pack:{" "}
                  <span className="text-white">
                    {packageDecisionSummary?.cheapest?.name || "Starter"}
                    {packageDecisionSummary?.cheapest?.priceLabel
                      ? ` · ${packageDecisionSummary.cheapest.priceLabel}`
                      : ""}
                  </span>
                </p>
                <p>
                  Largest wallet load:{" "}
                  <span className="text-white">
                    {packageDecisionSummary?.largest
                      ? `${packageDecisionSummary.largest.name} · ${formatUSNumber(packageDecisionSummary.largest.totalPts)} pts`
                      : "Catalog unavailable"}
                  </span>
                </p>
                <p>
                  Highest bonus:{" "}
                  <span className="text-white">
                    {packageDecisionSummary?.highestBonus
                      ? `${packageDecisionSummary.highestBonus.name} · ${packageDecisionSummary.highestBonus.bonusPct}% extra`
                      : "Catalog unavailable"}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                Membership
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                Best for repeat readers
              </h3>
              <p className="mt-3 text-sm leading-6 text-neutral-300">
                Membership works better when you read every week, want discounts on unlocks, and care about predictable monthly perks.
              </p>
              <div className="mt-4 space-y-2 text-sm text-neutral-400">
                <p>
                  Unlock savings:{" "}
                  <span className="text-white">
                    Up to {subscriptionStats?.maxDiscount ?? 0}% off premium unlocks
                  </span>
                </p>
                <p>
                  Daily access:{" "}
                  <span className="text-white">
                    Up to {subscriptionStats?.maxDailyFree ?? 0} free episodes each day
                  </span>
                </p>
                <p>
                  Wait reduction:{" "}
                  <span className="text-white">
                    As low as {subscriptionStats ? Math.round(subscriptionStats.bestTtf * 100) : 100}% of the standard timer
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
                  className="mt-5 rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
                >
                  {STOREFRONT_TERMS.compareMembership}
                </button>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                Checkout safeguards
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                Receipts and help stay visible
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-300">
                <li>Points are attached to the signed-in wallet so purchases stay synced across devices.</li>
                <li>Region pricing and tax notes stay visible before checkout instead of appearing after the fact.</li>
                <li>Orders keeps the receipt trail, while Support handles billing follow-up and manual escalation.</li>
                <li>
                  Self-serve refunds depend on billing availability and order state, so this page points users to the right path early.
                </li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  View orders
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/support")}
                  className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
                >
                  Billing support
                </button>
              </div>
            </div>
          </div>
        </SurfacePanel>
      </main>
    </div>
  );
}

