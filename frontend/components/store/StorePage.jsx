"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import PackageCard from "./PackageCard";
import { useWalletStore } from "../../store/useWalletStore";
import { useCouponStore } from "../../store/useCouponStore";
import { useAuthStore } from "../../store/useAuthStore";
import { trackEvent } from "../../lib/trackEvent";
import { POINTS_PACKS, OFFERS } from "../../lib/offers/catalog";
import { getRegionConfig } from "../../lib/region/config";
import { getCookie } from "../../lib/cookies";
import { apiGet } from "../../lib/apiClient";
import { fetchTopupCatalog } from "../../lib/topupCatalog";
import {
  buildPathWithAttribution,
  mergePaymentAttribution,
  readPaymentAttributionFromSearchParams,
} from "../../lib/paymentAttribution";
import { getPlanCatalog } from "../../lib/subscriptions";

const PromoBanner = dynamic(() => import("./PromoBanner"));

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

  const returnTo = searchParams.get("returnTo") || "/";
  const focus = searchParams.get("focus") || "";
  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(searchParams),
    [searchParams]
  );
  const promotionId = routeAttribution?.promotionId || "";
  const campaignId = routeAttribution?.campaignId || "";
  const sourceEntry = routeAttribution?.entryPoint || "STORE_ENTRY";
  const sourceSeriesId = routeAttribution?.sourceSeriesId || "";
  const sourceEpisodeId = routeAttribution?.sourceEpisodeId || "";
  const sourcePath = routeAttribution?.sourcePath || returnTo || "/store";
  const isSubscriber = Boolean(subscription?.active);
  const isNewPayer =
    typeof window !== "undefined"
      ? window.localStorage.getItem("mn_has_purchased") !== "1"
      : true;

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
    setRegion(stored || cookieRegion || "global");
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
      setPromotions(
        list.filter((promo) => ["FIRST_PURCHASE", "HOLIDAY", "RETURNING"].includes(promo.type))
      );
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchTopupCatalog()
      .then((packages) => {
        if (mounted) {
          setTopupCatalog(packages);
        }
      })
      .catch(() => {
        if (mounted) {
          setTopupCatalog([]);
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
        (best, plan) =>
          plan.ttfMultiplier && plan.ttfMultiplier < best ? plan.ttfMultiplier : best,
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

  const handleBuy = async (packageId) => {
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
      router.replace(returnTo);
      setErrorMessage("");
      return;
    }

    if (response.status === 401) {
      setErrorMessage("Please sign in to purchase POINTS.");
      if (typeof window !== "undefined") {
        const current = `${window.location.pathname}${window.location.search || ""}`;
        window.dispatchEvent(new CustomEvent("auth:open", { detail: { returnTo: current } }));
      }
      return;
    }

    setErrorMessage(response.error || "Top up failed. Please try again.");
  };

  const handleClaim = async () => {
    const code = couponCode.trim();
    if (!code) {
      return;
    }

    const response = await claimCoupon(code);
    if (response.ok) {
      trackEvent("coupon_claim", { code });
      setCouponMessage("Coupon applied.");
      setCouponCode("");
      return;
    }

    trackEvent("coupon_claim_fail", { code, status: response.status, errorCode: response.error });
    setCouponMessage(response.data?.message || response.error || "Invalid coupon.");
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Store</h1>
          <p className="mt-2 text-sm text-neutral-400">Buy POINTS to unlock episodes.</p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {promotions.length > 0
          ? promotions.map((promo) => <PromoBanner key={promo.id} promotion={promo} />)
          : isNewPayer
            ? <PromoBanner offer={OFFERS.first_purchase_bonus} />
            : null}

        <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-4 text-xs text-neutral-400">
          {getRegionConfig(region).taxHint}
        </div>

        {subscriptionStats ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-4 text-xs text-neutral-300">
            <div className="text-sm font-semibold text-white">Subscriber savings</div>
            <div className="mt-2 text-xs text-neutral-400">
              Save up to {subscriptionStats.maxDiscount}% on unlocks | Daily free up to {" "}
              {subscriptionStats.maxDailyFree} | TTF as fast as {" "}
              {Math.round(subscriptionStats.bestTtf * 100)}%
            </div>
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
                  })
                )
              }
              className="mt-3 rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200"
            >
              Compare subscription
            </button>
          </div>
        ) : null}

        <section className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Coupons</h2>
            <span className="text-xs text-neutral-500">{coupons.length} available</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder="Enter coupon code"
              className="flex-1 rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs"
            />
            <button
              type="button"
              onClick={handleClaim}
              className="rounded-full border border-neutral-700 px-4 py-2 text-xs"
            >
              Redeem
            </button>
          </div>
          {couponMessage ? <p className="text-xs text-neutral-400">{couponMessage}</p> : null}
          {coupons.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-[10px] text-neutral-300">
              {coupons.map((coupon) => (
                <span key={coupon.id} className="rounded-full border border-neutral-800 px-3 py-1">
                  {coupon.label || coupon.code}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {orderedPackages.map((pkg) => (
            <div key={pkg.id} className={busyId === pkg.id ? "opacity-70" : ""}>
              <PackageCard pkg={pkg} highlighted={pkg.id === focusId} onSelect={handleBuy} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
