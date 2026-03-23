"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Gift, Sparkles, Star, Zap } from "lucide-react";
import SiteHeader from "../layout/SiteHeader";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import CommerceRouteSummary from "../common/CommerceRouteSummary";
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
import { getSearchParam, toURLSearchParams } from "../../lib/pageSearchParams";
import { buildSupportPath } from "../../lib/supportRouting";
import { useAuthStore } from "../../store/useAuthStore";
import { formatUSCurrency, formatUSDate } from "../../lib/localization";
import { resolvePublicCommerceMode } from "../../lib/storefrontBillingState";

function openAuthPrompt() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("auth:open"));
}

function scrollToSection(id) {
  if (typeof document === "undefined") {
    return;
  }

  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

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

function formatPlanPrice(amount, currency = "USD") {
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

export default function SubscribePage({
  initialSearchParams = {},
  initialPlanCatalog = null,
  initialBillingAvailability = null,
}) {
  const router = useRouter();
  const { subscription, subscribe, cancelSubscription } = useWalletStore();
  const { isSignedIn } = useAuthStore();
  const [workingId, setWorkingId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [planCatalog, setPlanCatalogState] = useState(initialPlanCatalog || getPlanCatalog());
  const [billingAvailability, setBillingAvailability] = useState(initialBillingAvailability);
  const isActive = Boolean(subscription?.active);
  const returnTo = getSearchParam(initialSearchParams, "returnTo", "/account");
  const launchAccessLabel = isSignedIn ? "Open account" : "Sign in for launch access";
  const handleLaunchAccess = () => {
    if (isSignedIn) {
      router.push("/account");
      return;
    }
    openAuthPrompt();
  };
  const routeSearchParams = useMemo(() => toURLSearchParams(initialSearchParams), [initialSearchParams]);

  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(routeSearchParams),
    [routeSearchParams],
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

  const subscriptionMode = resolvePublicCommerceMode(billingAvailability, "subscriptionActionsEnabled");
  const subscriptionActionsEnabled = subscriptionMode.isRealCommerceLive;
  const subscriptionPrelaunch = subscriptionMode.isPrelaunch;
  const subscriptionAvailabilityLabel = isActive
    ? "Active"
    : subscriptionActionsEnabled
      ? "Open now"
      : "Prelaunch";
  const planComparisonRows = useMemo(
    () =>
      SUBSCRIPTION_OFFERS.map((plan) => {
        const key = plan.id.replace("subscribe_", "");
        const perks = planCatalog?.[key];
        const priceLabel =
          perks?.price !== undefined
            ? formatPlanPrice(perks.price, perks.currency || "USD")
            : plan.price;

        return {
          id: key,
          title: plan.title,
          priceLabel,
          dailyFreeUnlocks: perks?.dailyFreeUnlocks ?? "-",
          waitTimeLabel: perks?.ttfMultiplier ? `${Math.round(perks.ttfMultiplier * 100)}%` : "-",
          monthlyPoints: perks?.voucherPts ?? "-",
          savingsLabel: perks?.discountPct ? `${perks.discountPct}% off` : "-",
          bestFor: PLAN_FIT_GUIDE[key]?.title || "Recurring readers",
        };
      }),
    [planCatalog],
  );

  const handleSubscribe = async (planId) => {
    if (!isSignedIn) {
      setFeedback("Sign in first so membership, receipts, and renewal history stay on one account.");
      openAuthPrompt();
      return;
    }

    if (!subscriptionActionsEnabled) {
      setFeedback("Membership is in prelaunch. Sign in for launch access, compare point packs, or contact billing support.");
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
      router.push(buildSupportPath({ topic: "billing", context: "Membership cancellation help" }));
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

    return [
      {
        label: "Availability",
        value: subscriptionAvailabilityLabel,
        hint: isActive
          ? `${subscription?.planId || "Membership"} is active on this account.`
          : subscriptionActionsEnabled
            ? "Pick a tier when you want lower prices, free reads, and monthly points."
            : "Review the planned monthly pricing and perks here before membership opens.",
      },
      {
        label: "Model",
        value: "Monthly plan",
        hint: "Membership makes more sense when you unlock often and want one recurring plan.",
      },
      {
        label: "Best savings",
        value: maxDiscount > 0 ? `${maxDiscount}% off` : "Plan perks",
        hint: maxDiscount > 0
          ? "Highest unlock discount in the current lineup."
          : "Savings and perks appear once the current plan catalog is available.",
      },
      {
        label: "Billing",
        value: subscription?.renewAt
          ? `Renews ${formatUSDate(subscription.renewAt)}`
          : subscriptionActionsEnabled
            ? "Monthly recurring"
            : "Prelaunch",
        hint: subscription?.renewAt
          ? "Cancel before the renewal date if you want the plan to stop."
          : subscriptionActionsEnabled
            ? "Receipts and future charges stay in Purchases after checkout."
            : "When membership opens, renewals, receipts, and cancellation history stay in Purchases.",
      },
    ];
  }, [
    isActive,
    planCatalog,
    subscription?.planId,
    subscription?.renewAt,
    subscriptionAvailabilityLabel,
    subscriptionActionsEnabled,
    subscriptionPrelaunch,
  ]);

  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <main className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          appearance="light"
          accent="blue"
          eyebrow="Membership"
          title={subscriptionActionsEnabled ? "Pick the plan that fits your reading rhythm." : "Review membership pricing before launch."}
          description={
            subscriptionActionsEnabled
              ? "Membership is billed monthly while active. Choose it if you read often and want lower unlock prices, free reads, and monthly points."
              : "Compare monthly pricing, perks, and point packs before launch."
          }
          secondary={
            subscriptionActionsEnabled
              ? "Cancel before renewal if you want the plan to stop."
              : "Planned monthly pricing | no charge today"
          }
          stats={subscriptionHeroStats}
          actions={
            <>
              <button
                type="button"
                onClick={subscriptionActionsEnabled ? () => scrollToSection("membership-plans") : handleLaunchAccess}
                className={primaryButtonClass}
              >
                {subscriptionActionsEnabled ? "Compare plans" : launchAccessLabel}
              </button>
              <button
                type="button"
                onClick={() => router.push("/store")}
                className={secondaryButtonClass}
              >
                {STOREFRONT_TERMS.viewPointPacks}
              </button>
              {!isSignedIn && !isActive && subscriptionActionsEnabled ? (
                <button type="button" onClick={openAuthPrompt} className={secondaryButtonClass}>
                  {subscriptionActionsEnabled ? "Sign in" : "Sign in for launch access"}
                </button>
              ) : null}
            </>
          }
        />

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                {subscriptionActionsEnabled ? "Before you subscribe" : "Before launch"}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                {subscriptionActionsEnabled
                  ? "The billing rules should be obvious before you start a plan."
                  : "Know the billing rules before membership opens."}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Membership stays recurring and point packs stay separate on the Store page.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Recurring monthly billing",
                body: subscriptionPrelaunch
                  ? "Membership follows this recurring monthly model once billing opens."
                  : "You are charged each month while the plan stays active.",
              },
              {
                title: "Cancel before renewal",
                body: "If you do not want the next monthly charge, cancel before the listed renewal date.",
              },
              {
                title: "Receipts stay visible",
                body: "Renewals, invoices, and order IDs stay in Purchases instead of disappearing into email only.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-black/6 bg-white/88 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
              >
                <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </SurfacePanel>

        {!isSignedIn ? (
          <SurfacePanel className="space-y-4" appearance="light" accent="blue">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  {subscriptionActionsEnabled ? "Sign in first" : "Launch access"}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  {subscriptionActionsEnabled
                    ? "Membership belongs to your account, not just this browser."
                    : "Sign in now so launch access and later billing history stay on one account."}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {subscriptionActionsEnabled
                    ? "Sign in before you start a plan so renewals, receipts, cancellation, and support all stay attached to one account."
                    : "Keep future renewals, receipts, and cancellation history on one account."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={openAuthPrompt} className={primaryButtonClass}>
                  {subscriptionActionsEnabled ? "Sign in" : "Sign in for launch access"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/rankings?type=ttf&window=all")}
                  className={secondaryButtonClass}
                >
                  Browse free starts
                </button>
              </div>
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel id="membership-plans" className="space-y-6" appearance="light" accent="blue">
          {feedback ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {feedback}
            </div>
          ) : null}
          {subscriptionPrelaunch ? (
            <SurfacePanel tone="warning" appearance="light" accent="amber" className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-700">Membership starts are not live yet</p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Compare monthly tiers before launch.
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-amber-700/85">
                  Prices and perks are visible now. Membership does not start here yet.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    title: "No monthly charge today",
                    body: "Use this page to compare tiers.",
                  },
                  {
                    title: "Recurring billing stays the model",
                    body: "When membership opens, it renews monthly until canceled.",
                  },
                  {
                    title: "Receipts later",
                    body: "Purchases will hold renewals and receipts after launch. Support stays the billing path.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[22px] border border-amber-200/80 bg-white/92 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                  >
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
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
                  onClick={() => router.push("/store")}
                  className={secondaryButtonClass}
                >
                  Compare point packs
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(buildSupportPath({ topic: "billing", context: "Membership launch or billing question" }))
                  }
                  className={secondaryButtonClass}
                >
                  Billing help
                </button>
              </div>
            </SurfacePanel>
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
              const perks = planCatalog?.[key];
              const isBest = bestPlanId === key;
              const isCurrent = isActive && subscription?.planId === key;
              const priceLabel =
                perks?.price !== undefined
                  ? formatPlanPrice(perks.price, perks.currency || "USD")
                  : plan.price;
              const planNote = isCurrent
                ? "This plan is already active on your account. Renewal timing and receipts stay visible in Purchases."
                : subscriptionActionsEnabled
                  ? "Recurring monthly billing while active, with receipts in Purchases and billing help in Support."
                  : "";

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

                    {!subscriptionPrelaunch ? (
                      <button
                        type="button"
                        onClick={() => handleSubscribe(key)}
                        disabled={workingId === key || isCurrent || !subscriptionActionsEnabled}
                        className={primaryButtonClass}
                      >
                        {isCurrent
                          ? "Current plan"
                          : !isSignedIn
                            ? "Sign in to start"
                            : workingId === key
                              ? "Processing..."
                              : "Pick this plan"}
                      </button>
                    ) : null}
                    {planNote ? <p className="text-xs leading-5 text-slate-500">{planNote}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </SurfacePanel>

        <details className="overflow-hidden rounded-[26px] border border-black/8 bg-white sm:hidden">
          <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-slate-950">
            Compare membership details
          </summary>
          <div className="space-y-3 border-t border-black/8 px-4 py-4">
            {planComparisonRows.map((plan) => (
              <div key={plan.id} className="rounded-[20px] border border-black/8 bg-[#f8f9fc] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">{plan.title}</p>
                  <span className="text-sm font-semibold text-slate-950">{plan.priceLabel}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600">
                  <p>{plan.bestFor}</p>
                  <p>{plan.dailyFreeUnlocks} free reads / day</p>
                  <p>{plan.waitTimeLabel} of the normal wait</p>
                  <p>{plan.monthlyPoints} monthly points</p>
                  <p>{plan.savingsLabel} on locked chapters</p>
                </div>
              </div>
            ))}
          </div>
        </details>

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
                    const perks = planCatalog?.[key];
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
                    const perks = planCatalog?.[key];
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
                    const perks = planCatalog?.[key];
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
                    const perks = planCatalog?.[key];
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
                    ? `Renews on ${formatUSDate(subscription.renewAt)}`
                    : "Renewal date is not available yet."}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Cancel before the next renewal if you want the plan to stop. Purchases keeps the billing record, and Support can step in if something looks wrong.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={workingId === "cancel"}
                className={secondaryButtonClass}
              >
                {!subscriptionActionsEnabled
                  ? "Billing help"
                  : workingId === "cancel"
                    ? "Canceling..."
                    : "Cancel plan"}
              </button>
            </div>
          </SurfacePanel>
        ) : null}

        <CommerceRouteSummary
          eyebrow="Compare the paths"
          title="Membership is monthly. Point packs stay flexible. Help should stay obvious."
          description="Pick membership when you read often, use point packs when you unlock occasionally, and keep Purchases plus Support close when billing questions show up later."
          primary={{
            eyebrow: "Membership",
            title: subscriptionPrelaunch
              ? "Review monthly tiers before launch."
                : "Start a monthly plan when you read often.",
            description: subscriptionPrelaunch
              ? "Compare recurring pricing, perks, and point packs before launch."
                : "Cancel before the listed renewal date if you do not want the next monthly charge.",
            tags: [
              "Recurring monthly billing",
              isActive && subscription?.renewAt ? `Renews ${formatUSDate(subscription.renewAt)}` : "",
              isActive ? "Current plan active" : subscriptionPrelaunch ? "No charge today" : "For frequent readers",
            ].filter(Boolean),
            cta: subscriptionActionsEnabled ? "Compare plans" : "Review plans",
            onClick: () => scrollToSection("membership-plans"),
            secondaryCta: subscriptionActionsEnabled ? (!isSignedIn && !isActive ? "Sign in" : "") : launchAccessLabel,
            onSecondaryClick:
              subscriptionActionsEnabled ? (!isSignedIn && !isActive ? openAuthPrompt : null) : handleLaunchAccess,
          }}
          secondary={{
            eyebrow: "Point packs",
            title: "Use point packs when you want one-time unlocks.",
            description:
              "Store keeps point packs separate from membership: one-time spend, no recurring renewal, and a better fit for lighter reading habits.",
            tags: ["One-time packs", "Flexible unlocks", "No recurring charge"],
            cta: STOREFRONT_TERMS.viewPointPacks,
            onClick: () => router.push("/store"),
          }}
          support={{
            eyebrow: subscriptionActionsEnabled ? "After checkout" : "Before launch",
            title: subscriptionActionsEnabled
              ? "Receipts, renewals, and billing help stay close."
              : "Receipts, cancellation rules, and billing help are mapped out.",
            description:
              subscriptionActionsEnabled
                ? "Purchases keeps charges and renewals easy to verify later. Support handles cancellation questions, missing access, and billing issues."
                : "Purchases will keep renewals and receipts easy to verify after launch. Support stays the path for billing questions.",
            tags: ["Purchases", "Billing help"],
            cta: subscriptionActionsEnabled ? "View purchases" : "Where receipts will land",
            onClick: () => router.push("/orders"),
            secondaryCta: "Billing help",
            onSecondaryClick: () =>
              router.push(buildSupportPath({ topic: "billing", context: "Membership billing help or purchase question" })),
          }}
        />
      </main>
    </div>
  );
}
