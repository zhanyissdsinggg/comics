"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Zap, Gift, Star, Sparkles } from "lucide-react";
import SiteHeader from "../layout/SiteHeader";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import { SUBSCRIPTION_OFFERS } from "../../lib/offers/catalog";
import { getPlanCatalog, setPlanCatalog } from "../../lib/subscriptions";
import { apiGet } from "../../lib/apiClient";
import { getFriendlyMessage } from "../../lib/errorMessages";
import { useWalletStore } from "../../store/useWalletStore";
import {
  loadPersistedPaymentAttribution,
  mergePaymentAttribution,
  persistPaymentAttribution,
  readPaymentAttributionFromSearchParams,
} from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";

export default function SubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, subscribe, cancelSubscription } = useWalletStore();
  const [workingId, setWorkingId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [planCatalog, setPlanCatalogState] = useState(getPlanCatalog());
  const isActive = Boolean(subscription?.active);
  const baseUnlockPrice = 5;
  const returnTo = searchParams.get("returnTo") || "/account";

  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(searchParams),
    [searchParams],
  );
  const attribution = useMemo(
    () =>
      mergePaymentAttribution(loadPersistedPaymentAttribution(), routeAttribution, {
        entryPoint: routeAttribution?.entryPoint || "SUBSCRIBE_PAGE",
        returnTo,
      }),
    [returnTo, routeAttribution],
  );

  const bestPlanId = useMemo(() => {
    const entries = Object.entries(planCatalog || {});
    if (entries.length === 0) {
      return "";
    }
    entries.sort((a, b) => (b[1]?.discountPct || 0) - (a[1]?.discountPct || 0));
    return entries[0]?.[0] || "";
  }, [planCatalog]);

  useEffect(() => {
    let mounted = true;
    apiGet("/api/billing/plans").then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok && Array.isArray(response.data?.plans)) {
        const catalog = {};
        response.data.plans.forEach((plan) => {
          if (plan?.id) {
            catalog[plan.id] = plan;
          }
        });
        setPlanCatalog(catalog);
        setPlanCatalogState(catalog);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (attribution) {
      persistPaymentAttribution(attribution);
    }
  }, [attribution]);

  const handleSubscribe = async (planId) => {
    setWorkingId(planId);
    setFeedback("");
    trackEvent("subscribe_cta_click", {
      planId,
      entryPoint: attribution?.entryPoint,
      promotionId: attribution?.promotionId,
      offerId: attribution?.offerId || `subscribe_${planId}`,
    });
    const response = await subscribe(planId, {
      attribution: {
        ...attribution,
        offerId: attribution?.offerId || `subscribe_${planId}`,
      },
    });
    setWorkingId("");
    if (response.ok) {
      router.replace(returnTo);
      return;
    }

    setFeedback(
      getFriendlyMessage(response.error, response.message || "Subscription could not be updated right now."),
    );
  };

  const handleCancel = async () => {
    setWorkingId("cancel");
    setFeedback("");
    const response = await cancelSubscription();
    setWorkingId("");
    if (!response.ok) {
      setFeedback(
        getFriendlyMessage(response.error, response.message || "Subscription could not be updated right now."),
      );
    }
  };

  const getPlanIcon = (planId) => {
    if (planId.includes("basic")) return <Zap className="h-6 w-6" />;
    if (planId.includes("pro")) return <Star className="h-6 w-6" />;
    if (planId.includes("vip")) return <Sparkles className="h-6 w-6" />;
    return <Gift className="h-6 w-6" />;
  };

  const subscriptionHeroStats = useMemo(() => {
    const plans = Object.values(planCatalog || {});
    const maxDiscount = plans.reduce((max, plan) => Math.max(max, plan?.discountPct || 0), 0);
    const maxDailyFree = plans.reduce((max, plan) => Math.max(max, plan?.dailyFreeUnlocks || 0), 0);
    const maxVoucher = plans.reduce((max, plan) => Math.max(max, plan?.voucherPts || 0), 0);

    return [
      {
        label: "Status",
        value: isActive ? "Active" : "Available",
        hint: isActive
          ? `${subscription?.planId || "Membership"} is currently attached to this wallet.`
          : "Choose a tier to unlock discounts and daily free reads.",
      },
      {
        label: "Discount",
        value: `${maxDiscount}%`,
        hint: "Top unlock discount across the current catalog.",
      },
      {
        label: "Daily Free",
        value: maxDailyFree.toLocaleString(),
        hint: "Highest free-episode allowance available today.",
      },
      {
        label: "Bonus Pts",
        value: maxVoucher.toLocaleString(),
        hint: subscription?.renewAt
          ? `Renews ${new Date(subscription.renewAt).toLocaleDateString()}`
          : "Monthly voucher points on qualifying plans.",
      },
    ];
  }, [isActive, planCatalog, subscription?.planId, subscription?.renewAt]);

  const secondaryButtonClass =
    "rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Membership"
          title="Choose a plan with clear perks, clear pricing, and no storefront noise."
          description="Plan comparison stays visible even when secure subscription billing is still being configured, so users can review the tiers before checkout opens."
          secondary="Each tier keeps the same benefit math, but activation now depends on secure billing being available on the backend."
          stats={subscriptionHeroStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/account")}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Account Overview
              </button>
              <button
                type="button"
                onClick={() => router.push("/store")}
                className={secondaryButtonClass}
              >
                Buy points
              </button>
            </>
          }
        />

        <SurfacePanel className="space-y-6">
          {feedback ? (
            <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {feedback}
            </div>
          ) : null}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Plans
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                Three tiers, one consistent membership surface
              </h2>
            </div>
            <p className="text-xs text-neutral-500">
              {isActive ? `Current plan: ${subscription?.planId}` : `${SUBSCRIPTION_OFFERS.length} tiers available`}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {SUBSCRIPTION_OFFERS.map((plan) => {
              const key = plan.id.replace("subscribe_", "");
              const perks = planCatalog[key];
              const isBest = bestPlanId === key;
              const isCurrent = isActive && subscription?.planId === key;
              const priceLabel =
                perks?.price !== undefined
                  ? `${perks.currency || "USD"} ${Number(perks.price).toFixed(2)}`
                  : plan.price;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-[28px] border p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl transition ${
                    isBest
                      ? "border-emerald-500/35 bg-[linear-gradient(160deg,rgba(16,185,129,0.16),rgba(10,10,10,0.92))]"
                      : "border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]"
                  } ${isCurrent ? "ring-2 ring-emerald-400/50" : ""}`}
                >
                  {isBest ? (
                    <div className="absolute -top-3 left-5 rounded-full bg-emerald-400 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-950">
                      Best value
                    </div>
                  ) : null}
                  <div className="space-y-5 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                            isBest ? "bg-emerald-400 text-neutral-950" : "bg-black/30 text-neutral-200"
                          }`}
                        >
                          {getPlanIcon(plan.id)}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                            {plan.tag}
                          </p>
                          <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
                            {plan.title}
                          </h3>
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
                          Active
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2 border-t border-white/10 pt-5">
                      <div className="flex items-end gap-2">
                        <span className="font-display text-4xl font-semibold tracking-tight text-white">
                          {priceLabel}
                        </span>
                        <span className="pb-1 text-sm text-neutral-400">/month</span>
                      </div>
                      {perks?.discountPct ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          <Zap className="h-3.5 w-3.5" />
                          Save {perks.discountPct}% on unlocks
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3 border-t border-white/10 pt-5 text-sm text-neutral-300">
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15">
                          <Check className="h-3 w-3 text-emerald-300" />
                        </div>
                        <span>
                          <span className="font-semibold text-white">{perks?.dailyFreeUnlocks ?? "-"}</span> daily free episodes
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15">
                          <Check className="h-3 w-3 text-emerald-300" />
                        </div>
                        <span>
                          <span className="font-semibold text-white">
                            {perks?.ttfMultiplier ? `${Math.round(perks.ttfMultiplier * 100)}%` : "-"}
                          </span>{" "}
                          of the normal free-unlock wait
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15">
                          <Check className="h-3 w-3 text-emerald-300" />
                        </div>
                        <span>
                          <span className="font-semibold text-white">{perks?.voucherPts ?? "-"}</span> monthly bonus points
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15">
                          <Check className="h-3 w-3 text-emerald-300" />
                        </div>
                        <span>
                          Save roughly {perks?.discountPct ? Math.round((perks.discountPct / 100) * baseUnlockPrice * 10) : 0} pts per 10 unlocks
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSubscribe(key)}
                      disabled={workingId === key || isCurrent}
                      className={`w-full rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isBest
                          ? "bg-emerald-400 text-neutral-950 hover:bg-emerald-300"
                          : "bg-white text-neutral-950 hover:bg-neutral-200"
                      }`}
                    >
                      {isCurrent ? "Current Plan" : workingId === key ? "Processing..." : "Choose this plan"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SurfacePanel>

        <SurfacePanel className="hidden sm:block">
          <h3 className="font-display text-2xl font-semibold tracking-tight text-white">Compare Plans</h3>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-neutral-400">
                  <th className="pb-4 font-semibold">Feature</th>
                  {SUBSCRIPTION_OFFERS.map((plan) => (
                    <th key={plan.id} className="pb-4 text-center font-semibold text-white">
                      {plan.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <tr>
                  <td className="py-4 text-neutral-300">Daily Free Episodes</td>
                  {SUBSCRIPTION_OFFERS.map((plan) => {
                    const key = plan.id.replace("subscribe_", "");
                    const perks = planCatalog[key];
                    return (
                      <td key={plan.id} className="py-4 text-center font-semibold text-white">
                        {perks?.dailyFreeUnlocks ?? "-"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-4 text-neutral-300">Free Unlock Wait</td>
                  {SUBSCRIPTION_OFFERS.map((plan) => {
                    const key = plan.id.replace("subscribe_", "");
                    const perks = planCatalog[key];
                    return (
                      <td key={plan.id} className="py-4 text-center font-semibold text-white">
                        {perks?.ttfMultiplier ? `${Math.round(perks.ttfMultiplier * 100)}%` : "-"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-4 text-neutral-300">Monthly Bonus Points</td>
                  {SUBSCRIPTION_OFFERS.map((plan) => {
                    const key = plan.id.replace("subscribe_", "");
                    const perks = planCatalog[key];
                    return (
                      <td key={plan.id} className="py-4 text-center font-semibold text-white">
                        {perks?.voucherPts ?? "-"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-4 text-neutral-300">Unlock Discount</td>
                  {SUBSCRIPTION_OFFERS.map((plan) => {
                    const key = plan.id.replace("subscribe_", "");
                    const perks = planCatalog[key];
                    return (
                      <td key={plan.id} className="py-4 text-center">
                        {perks?.discountPct ? (
                          <span className="font-semibold text-emerald-300">{perks.discountPct}%</span>
                        ) : (
                          <span className="text-neutral-500">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </SurfacePanel>

        {isActive ? (
          <SurfacePanel className="border border-emerald-400/25 bg-emerald-500/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Active subscription
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  {subscription?.planId}
                </h3>
                <p className="mt-2 text-sm text-neutral-300">
                  {subscription?.renewAt
                    ? `Renews on ${new Date(subscription.renewAt).toLocaleDateString()}`
                    : "Renewal date is not available yet."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={workingId === "cancel"}
                className={secondaryButtonClass}
              >
                {workingId === "cancel" ? "Canceling..." : "Cancel Subscription"}
              </button>
            </div>
          </SurfacePanel>
        ) : null}
      </main>
    </div>
  );
}
