"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Gift, Sparkles, Star, Zap } from "lucide-react";
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
import { persistCommerceSuccess } from "../../lib/commerceSuccess";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";

const PLAN_FIT_GUIDE = {
  basic: {
    title: "Light readers",
    description: "Good for readers who unlock a few chapters each week and want a lighter monthly spend.",
  },
  pro: {
    title: "Weekly regulars",
    description: "Best for readers following multiple series who want stronger savings and more free reads.",
  },
  vip: {
    title: "Daily binge readers",
    description: "Built for readers who use Gush constantly and want the fullest set of monthly benefits.",
  },
};

export default function SubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, subscribe, cancelSubscription } = useWalletStore();
  const [workingId, setWorkingId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [planCatalog, setPlanCatalogState] = useState(getPlanCatalog());
  const [billingAvailability, setBillingAvailability] = useState(null);
  const isActive = Boolean(subscription?.active);
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
        setBillingAvailability(response.data?.billing || null);
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

  const subscriptionActionsEnabled = billingAvailability?.subscriptionActionsEnabled === true;
  const subscriptionPreviewOnly = billingAvailability?.subscriptionActionsEnabled === false;

  const handleSubscribe = async (planId) => {
    if (!subscriptionActionsEnabled) {
      setFeedback("You can compare every plan right now. Starting membership opens once checkout is live.");
      return;
    }

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
      persistCommerceSuccess({
        kind: "subscribe",
        planId,
        planTitle: planCatalog?.[planId]?.title || planId,
        orderId: response.data?.order?.orderId,
        entryPoint: attribution?.entryPoint || undefined,
        targetPath: returnTo,
      });
      router.replace(returnTo);
      return;
    }

    setFeedback(
      getFriendlyMessage(response.error, response.message || "We couldn't update membership right now."),
    );
  };

  const handleCancel = async () => {
    if (!subscriptionActionsEnabled) {
      router.push("/support");
      return;
    }

    setWorkingId("cancel");
    setFeedback("");
    const response = await cancelSubscription();
    setWorkingId("");
    if (!response.ok) {
      setFeedback(
        getFriendlyMessage(response.error, response.message || "We couldn't update membership right now."),
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
        value: isActive ? "Active" : "Ready",
        hint: isActive
          ? `${subscription?.planId || "Membership"} is active on this account.`
          : "Pick a tier when you want lower prices, free reads, and monthly points.",
      },
      {
        label: "Best savings",
        value: `${maxDiscount}%`,
        hint: "Highest unlock discount in the current lineup.",
      },
      {
        label: "Free reads",
        value: maxDailyFree.toLocaleString(),
        hint: "Most free reads a plan gives you in one day.",
      },
      {
        label: "Monthly points",
        value: maxVoucher.toLocaleString(),
        hint: subscription?.renewAt
          ? `Renews ${new Date(subscription.renewAt).toLocaleDateString()}`
          : "Extra monthly points on eligible plans.",
      },
    ];
  }, [isActive, planCatalog, subscription?.planId, subscription?.renewAt]);

  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-50";

  const billingGuardrails = useMemo(
    () => [
      {
        title: "Pricing should be obvious",
        body: "You should know the price and what changes before you start a plan.",
      },
      {
        title: "Receipts stay easy to find",
        body: "Purchases is where renewals and charges should stay visible.",
      },
      {
        title: subscriptionPreviewOnly ? "Membership starts later" : "Changing plans stays simple",
        body: subscriptionPreviewOnly
          ? "You can compare every tier now and come back when checkout is open."
          : "Starting or canceling a plan should never feel hidden.",
      },
      {
        title: "Help is still close",
        body: "If billing gets weird, support should still be one click away.",
      },
    ],
    [subscriptionPreviewOnly],
  );

  return (
    <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <main className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          appearance="light"
          accent="blue"
          eyebrow="Membership"
          title="Pick the plan that fits your reading rhythm."
          description={
            subscriptionPreviewOnly
              ? "Look through every tier now. Starting membership opens here once checkout is ready."
              : "Choose the tier that feels right for how often you read, not just for the lowest price."
          }
          secondary={
            subscriptionPreviewOnly
              ? "Plans are live to compare. Starting is still paused for now."
              : "Everything important should be clear before you start."
          }
          stats={subscriptionHeroStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push(returnTo)}
                className={primaryButtonClass}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => router.push("/store")}
                className={secondaryButtonClass}
              >
                {STOREFRONT_TERMS.viewPointPacks}
              </button>
            </>
          }
        />

        <SurfacePanel id="membership-plans" className="space-y-6" appearance="light" accent="blue">
          {feedback ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {feedback}
            </div>
          ) : null}
          {subscriptionPreviewOnly ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Starting membership is not live yet. You can still compare every tier here.
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Plans
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Three tiers. Three reading habits.
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {isActive ? `Current: ${subscription?.planId}` : `${SUBSCRIPTION_OFFERS.length} tiers available`}
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
                  className={`relative rounded-[30px] border p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)] transition-all duration-300 ${
                    isBest
                      ? "border-[rgba(47,107,255,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,246,255,0.98))]"
                      : "border-black/6 bg-white"
                  } ${isCurrent ? "ring-2 ring-[rgba(47,107,255,0.22)]" : ""}`}
                >
                  {isBest ? (
                    <div className="absolute -top-3 left-5 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white">
                      Best value
                    </div>
                  ) : null}

                  <div className="space-y-5 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                            isBest
                              ? "bg-[rgba(47,107,255,0.1)] text-[var(--gush-accent,#2f6bff)]"
                              : "bg-[#f8f9fc] text-slate-600"
                          }`}
                        >
                          {getPlanIcon(plan.id)}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                            {plan.tag}
                          </p>
                          <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950">
                            {plan.title}
                          </h3>
                          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-600">
                            {PLAN_FIT_GUIDE[key]?.description || "Built for readers who come back often."}
                          </p>
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--gush-accent,#2f6bff)]">
                          Active
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2 border-t border-black/6 pt-5">
                      <div className="flex items-end gap-2">
                        <span className="font-display text-4xl font-semibold tracking-tight text-slate-950">
                          {priceLabel}
                        </span>
                        <span className="pb-1 text-sm text-slate-500">/month</span>
                      </div>
                      {perks?.discountPct ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(47,107,255,0.08)] px-3 py-1 text-xs font-semibold text-[var(--gush-accent,#2f6bff)]">
                          <Zap className="h-3.5 w-3.5" />
                          Save {perks.discountPct}% on locked chapters
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3 border-t border-black/6 pt-5 text-sm text-slate-600">
                      <div className="rounded-2xl border border-black/8 bg-[#f8f9fc] px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Best for
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {PLAN_FIT_GUIDE[key]?.title || "Recurring readers"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(47,107,255,0.1)]">
                          <Check className="h-3 w-3 text-[var(--gush-accent,#2f6bff)]" />
                        </div>
                        <span>
                          <span className="font-semibold text-slate-950">{perks?.dailyFreeUnlocks ?? "-"}</span> free reads a day
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(47,107,255,0.1)]">
                          <Check className="h-3 w-3 text-[var(--gush-accent,#2f6bff)]" />
                        </div>
                        <span>
                          <span className="font-semibold text-slate-950">
                            {perks?.ttfMultiplier ? `${Math.round(perks.ttfMultiplier * 100)}%` : "-"}
                          </span>{" "}
                          of the normal wait
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(47,107,255,0.1)]">
                          <Check className="h-3 w-3 text-[var(--gush-accent,#2f6bff)]" />
                        </div>
                        <span>
                          <span className="font-semibold text-slate-950">{perks?.voucherPts ?? "-"}</span> monthly points
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(47,107,255,0.1)]">
                          <Check className="h-3 w-3 text-[var(--gush-accent,#2f6bff)]" />
                        </div>
                        <span>
                          Better value if you unlock often
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSubscribe(key)}
                      disabled={workingId === key || isCurrent || !subscriptionActionsEnabled}
                      className={primaryButtonClass}
                    >
                      {isCurrent
                        ? "Current plan"
                        : !subscriptionActionsEnabled
                          ? "Coming soon"
                          : workingId === key
                            ? "Processing..."
                            : "Pick this plan"}
                    </button>
                    <p className="text-xs leading-5 text-slate-500">
                      Charges stay on your account, with receipts in Purchases and help in Support.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </SurfacePanel>

        <SurfacePanel className="hidden sm:block" appearance="light" accent="blue">
          <h3 className="font-display text-2xl font-semibold tracking-tight text-slate-950">See the difference</h3>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/8 text-left text-slate-500">
                  <th className="pb-4 font-semibold">Feature</th>
                  {SUBSCRIPTION_OFFERS.map((plan) => (
                    <th key={plan.id} className="pb-4 text-center font-semibold text-slate-950">
                      {plan.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/8">
                <tr>
                  <td className="py-4 text-slate-600">Free Reads / Day</td>
                  {SUBSCRIPTION_OFFERS.map((plan) => {
                    const key = plan.id.replace("subscribe_", "");
                    const perks = planCatalog[key];
                    return (
                      <td key={plan.id} className="py-4 text-center font-semibold text-slate-950">
                        {perks?.dailyFreeUnlocks ?? "-"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-4 text-slate-600">Wait Time</td>
                  {SUBSCRIPTION_OFFERS.map((plan) => {
                    const key = plan.id.replace("subscribe_", "");
                    const perks = planCatalog[key];
                    return (
                      <td key={plan.id} className="py-4 text-center font-semibold text-slate-950">
                        {perks?.ttfMultiplier ? `${Math.round(perks.ttfMultiplier * 100)}%` : "-"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-4 text-slate-600">Monthly Points</td>
                  {SUBSCRIPTION_OFFERS.map((plan) => {
                    const key = plan.id.replace("subscribe_", "");
                    const perks = planCatalog[key];
                    return (
                      <td key={plan.id} className="py-4 text-center font-semibold text-slate-950">
                        {perks?.voucherPts ?? "-"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-4 text-slate-600">Unlock Savings</td>
                  {SUBSCRIPTION_OFFERS.map((plan) => {
                    const key = plan.id.replace("subscribe_", "");
                    const perks = planCatalog[key];
                    return (
                      <td key={plan.id} className="py-4 text-center">
                        {perks?.discountPct ? (
                          <span className="font-semibold text-[var(--gush-accent,#2f6bff)]">{perks.discountPct}%</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </SurfacePanel>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Before you start
              </p>
              <h3 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                Membership should feel easy to understand.
              </h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {billingGuardrails.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-black/8 bg-[#f8f9fc] p-4"
                >
                  <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
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
                Contact support
              </button>
            </div>
          </SurfacePanel>

          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Tier fit guide
              </p>
              <h3 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                Choose by habit, not just price.
              </h3>
            </div>
            <div className="space-y-3">
              {SUBSCRIPTION_OFFERS.map((plan) => {
                const key = plan.id.replace("subscribe_", "");
                const perks = planCatalog[key];
                const guide = PLAN_FIT_GUIDE[key];

                return (
                  <div
                    key={plan.id}
                    className="rounded-[24px] border border-black/8 bg-[#f8f9fc] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{plan.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{guide?.description}</p>
                      </div>
                      <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                        {perks?.discountPct ?? 0}% off
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span className="rounded-full border border-black/8 bg-white px-3 py-1">
                        {perks?.dailyFreeUnlocks ?? "-"} free reads
                      </span>
                      <span className="rounded-full border border-black/8 bg-white px-3 py-1">
                        {perks?.voucherPts ?? "-"} monthly points
                      </span>
                      <span className="rounded-full border border-black/8 bg-white px-3 py-1">
                        {perks?.ttfMultiplier ? `${Math.round(perks.ttfMultiplier * 100)}% wait` : "Normal wait"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SurfacePanel>
        </div>

        {isActive ? (
          <SurfacePanel className="border-[rgba(47,107,255,0.16)]" appearance="light" accent="blue">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Active membership
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  {subscription?.planId}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {subscription?.renewAt
                    ? `Renews on ${new Date(subscription.renewAt).toLocaleDateString()}`
                    : "Renewal date is not available yet."}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Purchases keeps your receipts, and Support is there if billing needs someone to step in.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={workingId === "cancel"}
                className={secondaryButtonClass}
              >
                {!subscriptionActionsEnabled
                  ? "Need help?"
                  : workingId === "cancel"
                    ? "Canceling..."
                    : "Cancel plan"}
              </button>
            </div>
          </SurfacePanel>
        ) : null}
      </main>
    </div>
  );
}
