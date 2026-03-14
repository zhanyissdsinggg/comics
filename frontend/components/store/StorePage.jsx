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
  const returnLabel =
    /^\/(read|series)\//.test(returnTo) || sourceEntry.includes("READER")
      ? "Back to reading"
      : "Go back";

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
          : "Sign in to keep redeemed coupons synced.",
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
          description="Balance, coupons, promotions, and point packs are grouped into one cleaner purchase flow without hiding the details that matter."
          secondary={`${regionConfig.label} storefront - ${regionConfig.taxHint}`}
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
                  View plans
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
                  View plans
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
                  placeholder="Enter coupon code"
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={handleClaim}
                  className={secondaryButtonClass}
                >
                  Redeem
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
                  Point packages
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  Purchase packs with the featured offer surfaced first
                </h2>
              </div>
              <p className="text-xs text-neutral-500">{orderedPackages.length} packages ready</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {orderedPackages.map((pkg) => (
                <div key={pkg.id} className={busyId === pkg.id ? "opacity-70" : ""}>
                  <PackageCard pkg={pkg} highlighted={pkg.id === focusId} onSelect={handleBuy} />
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>
      </main>
    </div>
  );
}

