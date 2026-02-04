"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import PackageCard from "./PackageCard";
import PromoBanner from "./PromoBanner";
import { useWalletStore } from "../../store/useWalletStore";
import { useCouponStore } from "../../store/useCouponStore";
import { track } from "../../lib/analytics";
import { POINTS_PACKS, OFFERS } from "../../lib/offers/catalog";
import { decideOffers } from "../../lib/offers/decide";
import { getBucket, getOrCreateUserId, trackExposure } from "../../lib/experiments/ab";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { getRegionConfig } from "../../lib/region/config";
import { getCookie } from "../../lib/cookies";
import { apiGet } from "../../lib/apiClient";
import { getPlanCatalog } from "../../lib/subscriptions";

export default function StorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { topup } = useWalletStore();
  const { paidPts, bonusPts, subscription } = useWalletStore();
  const { coupons, loadCoupons, claimCoupon } = useCouponStore();
  const { isAdultMode } = useAdultGateStore();
  const returnTo = searchParams.get("returnTo") || "/";
  const focus = searchParams.get("focus") || "";
  const [busyId, setBusyId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [region, setRegion] = useState("global");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [promotions, setPromotions] = useState([]);
  const [topupCatalog, setTopupCatalog] = useState([]);
  const isSubscriber = Boolean(subscription?.active);
  const isNewPayer =
    typeof window !== "undefined"
      ? window.localStorage.getItem("mn_has_purchased") !== "1"
      : true;
  const userId = typeof window !== "undefined" ? getOrCreateUserId() : "guest";
  const bucketMap = useMemo(
    () => ({
      unlock_offer_v1: getBucket(userId, "unlock_offer_v1"),
      topup_offer_v1: getBucket(userId, "topup_offer_v1"),
      subscribe_upsell_v1: getBucket(userId, "subscribe_upsell_v1"),
    }),
    [userId]
  );

  useEffect(() => {
    track("store_view", { focus });
  }, [focus]);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("mn_region")
        : null;
    const cookieRegion = getCookie("mn_region");
    setRegion(stored || cookieRegion || "global");
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  useEffect(() => {
    let mounted = true;
    apiGet("/api/promotions").then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok) {
        const list = response.data?.promotions || [];
        setPromotions(
          list.filter((promo) =>
            ["FIRST_PURCHASE", "HOLIDAY", "RETURNING"].includes(promo.type)
          )
        );
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    apiGet("/api/billing/topups").then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok && Array.isArray(response.data?.packages)) {
        setTopupCatalog(response.data.packages);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    Object.entries(bucketMap).forEach(([experimentId, bucket]) => {
      trackExposure(experimentId, bucket);
    });
  }, [bucketMap]);

  const offerDecision = useMemo(
    () =>
      decideOffers({
        user: {
          isSubscriber,
          paidPts,
          bonusPts,
          isNewPayer,
          region: "global",
          isAdultMode,
        },
        content: {},
        entry: "STORE_ENTRY",
        experiments: { bucketMap },
      }),
    [isSubscriber, paidPts, bonusPts, isNewPayer, isAdultMode, bucketMap]
  );

  const subscriptionStats = useMemo(() => {
    const plans = Object.values(getPlanCatalog() || {});
    if (!plans.length) {
      return null;
    }
    const maxDiscount = plans.reduce((max, plan) => Math.max(max, plan.discountPct || 0), 0);
    const maxDailyFree = plans.reduce((max, plan) => Math.max(max, plan.dailyFreeUnlocks || 0), 0);
    const bestTtf = plans.reduce(
      (best, plan) =>
        plan.ttfMultiplier && plan.ttfMultiplier < best ? plan.ttfMultiplier : best,
      1
    );
    return {
      maxDiscount,
      maxDailyFree,
      bestTtf,
    };
  }, []);

  const focusId = useMemo(() => {
    if (focus && focus !== "auto") {
      return focus;
    }
    const recommended = offerDecision?.recommendedTopupPackageId;
    return recommended?.replace("points_pack_", "") || "";
  }, [focus, offerDecision?.recommendedTopupPackageId]);

  useEffect(() => {
    if (!focusId) {
      return;
    }
    track("offer_impression", {
      offerId: `points_pack_${focusId}`,
      entry: "STORE_ENTRY",
    });
  }, [focusId, focus, region]);

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
    return [selected, ...packages.filter((pkg) => pkg.id !== focus)];
  }, [focusId, focus, region, topupCatalog]);

  const handleBuy = async (packageId) => {
    setBusyId(packageId);
    track("topup_start", { packageId });
    track("package_click", { packageId });
    track("offer_click", { offerId: `points_pack_${packageId}`, entry: "STORE_ENTRY" });
    const response = await topup(packageId);
    setBusyId(null);
    if (response.ok) {
      track("offer_purchase_success", {
        offerId: `points_pack_${packageId}`,
        entry: "STORE_ENTRY",
        orderId: response.data?.order?.orderId,
      });
      track("topup_success", { packageId, orderId: response.data?.order?.orderId });
      router.replace(returnTo);
      setErrorMessage("");
      return;
    }
    if (response.status === 401) {
      track("topup_fail", {
        packageId,
        status: response.status,
        errorCode: response.error,
        requestId: response.requestId,
      });
      setErrorMessage("Please sign in to purchase POINTS.");
      if (typeof window !== "undefined") {
        const current = `${window.location.pathname}${window.location.search || ""}`;
        window.dispatchEvent(new CustomEvent("auth:open", { detail: { returnTo: current } }));
      }
      return;
    }
    track("topup_fail", {
      packageId,
      status: response.status,
      errorCode: response.error,
      requestId: response.requestId,
    });
    setErrorMessage(response.error || "Top up failed. Please try again.");
  };

  const handleClaim = async () => {
    const code = couponCode.trim();
    if (!code) {
      return;
    }
    const response = await claimCoupon(code);
    if (response.ok) {
      track("coupon_claim", { code });
      setCouponMessage("Coupon applied.");
      setCouponCode("");
      return;
    }
    track("coupon_claim_fail", { code, status: response.status, errorCode: response.error });
    setCouponMessage(response.data?.message || response.error || "Invalid coupon.");
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Store</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Buy POINTS to unlock episodes.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {promotions.length > 0
          ? promotions.map((promo) => (
              <PromoBanner key={promo.id} promotion={promo} />
            ))
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
              Save up to {subscriptionStats.maxDiscount}% on unlocks • Daily free up to{" "}
              {subscriptionStats.maxDailyFree} • TTF as fast as{" "}
              {Math.round(subscriptionStats.bestTtf * 100)}%
            </div>
            <button
              type="button"
              onClick={() => router.push(`/subscribe?returnTo=${returnTo}`)}
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
          {couponMessage ? (
            <p className="text-xs text-neutral-400">{couponMessage}</p>
          ) : null}
          {coupons.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-[10px] text-neutral-300">
              {coupons.map((coupon) => (
                <span
                  key={coupon.id}
                  className="rounded-full border border-neutral-800 px-3 py-1"
                >
                  {coupon.label || coupon.code}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {orderedPackages.map((pkg) => (
            <div key={pkg.id} className={busyId === pkg.id ? "opacity-70" : ""}>
              <PackageCard
                pkg={pkg}
                highlighted={pkg.id === focusId}
                onSelect={handleBuy}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
