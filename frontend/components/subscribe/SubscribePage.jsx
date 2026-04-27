"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Gift, Sparkles, Star, Zap } from "lucide-react";
import SiteHeader from "../layout/SiteHeader";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import { SUBSCRIPTION_OFFERS } from "../../lib/offers/catalog";
import {
  getPlanCatalog,
  resolvePlanCatalog,
  setPlanCatalog,
} from "../../lib/subscriptions";
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
import { formatUSDate, formatUSDisplayCurrency } from "../../lib/localization";
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

  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const PLAN_FIT_GUIDE = {
  basic: {
    title: "Light readers",
    description: "",
  },
  pro: {
    title: "Weekly regulars",
    description: "",
  },
  vip: {
    title: "Daily binge readers",
    description: "",
  },
};

function formatPlanPrice(amount, currency = "USD") {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "";
  }

  return formatUSDisplayCurrency(numericAmount, currency);
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
  const [planCatalog, setPlanCatalogState] = useState(() =>
    resolvePlanCatalog(initialPlanCatalog || getPlanCatalog()),
  );
  const [billingAvailability, setBillingAvailability] = useState(
    initialBillingAvailability,
  );
  const isActive = Boolean(subscription?.active);
  const returnTo = getSearchParam(initialSearchParams, "returnTo", "/account");
  const launchAccessLabel = isSignedIn ? "Account" : "Sign in";
  const handleLaunchAccess = () => {
    if (isSignedIn) {
      router.push("/account");
      return;
    }
    openAuthPrompt();
  };
  const routeSearchParams = useMemo(
    () => toURLSearchParams(initialSearchParams),
    [initialSearchParams],
  );

  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(routeSearchParams),
    [routeSearchParams],
  );
  const attribution = useMemo(
    () =>
      mergePaymentAttribution(
        loadPersistedPaymentAttribution(),
        routeAttribution,
        {
          entryPoint: routeAttribution?.entryPoint || "SUBSCRIBE_PAGE",
          returnTo,
        },
      ),
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
        setPlanCatalogState(resolvePlanCatalog(catalog));
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

  const subscriptionMode = resolvePublicCommerceMode(
    billingAvailability,
    "subscriptionActionsEnabled",
  );
  const subscriptionActionsEnabled = subscriptionMode.isRealCommerceLive;
  const subscriptionPrelaunch = subscriptionMode.isPrelaunch;
  const subscriptionAvailabilityLabel = isActive
    ? "Active"
    : subscriptionActionsEnabled
      ? "Live"
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
          waitTimeLabel: perks?.ttfMultiplier
            ? `${Math.round(perks.ttfMultiplier * 100)}%`
            : "-",
          monthlyPoints: perks?.voucherPts ?? "-",
          savingsLabel: perks?.discountPct ? `${perks.discountPct}% off` : "-",
          bestFor: PLAN_FIT_GUIDE[key]?.title || "Recurring readers",
        };
      }),
    [planCatalog],
  );
  const getPlanBadgeLabel = (plan, isBest) => {
    const tag = String(plan?.tag || "").trim();
    if (!tag) {
      return "";
    }

    if (isBest && tag.toLowerCase() === "best value") {
      return "";
    }

    return tag;
  };

  const handleSubscribe = async (planId) => {
    if (!isSignedIn) {
      setFeedback("Sign in.");
      openAuthPrompt();
      return;
    }

    if (!subscriptionActionsEnabled) {
      setFeedback("Not live yet.");
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
      getFriendlyMessage(
        response.error,
        response.message || "We couldn't update membership right now.",
      ),
    );
  };

  const handleCancel = async () => {
    if (!subscriptionActionsEnabled) {
      router.push(
        buildSupportPath({
          topic: "billing",
          context: "Membership cancellation help",
        }),
      );
      return;
    }

    setWorkingId("cancel");
    setFeedback("");
    const response = await cancelSubscription();
    setWorkingId("");
    if (!response.ok) {
      setFeedback(
        getFriendlyMessage(
          response.error,
          response.message || "We couldn't update membership right now.",
        ),
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
    const maxDiscount = plans.reduce(
      (max, plan) => Math.max(max, plan?.discountPct || 0),
      0,
    );

    return [
      isActive || subscriptionActionsEnabled
        ? {
            label: "Availability",
            value: subscriptionAvailabilityLabel,
          }
        : null,
      {
        label: "Model",
        value: "Monthly plan",
      },
      {
        label: "Best savings",
        value: maxDiscount > 0 ? `${maxDiscount}% off` : "Plan perks",
      },
    ].filter(Boolean);
  }, [
    isActive,
    planCatalog,
    subscriptionAvailabilityLabel,
    subscriptionActionsEnabled,
  ]);

  const primaryButtonClass =
    "inline-flex min-h-[48px] items-center justify-center rounded-full border border-black bg-black px-5 py-3 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-all hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryButtonClass =
    "inline-flex min-h-[48px] items-center justify-center rounded-full border border-black/12 bg-white px-5 py-3 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all hover:border-black/18 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50";
  const quietCardClass =
    "rounded-[24px] border border-black/10 bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]";
  const compareShellClass =
    "overflow-hidden rounded-[30px] border border-black/10 bg-[#f8f9fb] shadow-[0_24px_60px_rgba(15,23,42,0.08)]";
  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
      <SiteHeader variant="home" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            accent="blue"
            appearance="light"
            eyebrow="Membership"
            title="Membership"
            description=""
            stats={subscriptionHeroStats}
          />

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                Membership
              </p>
              <div>
                <h2 className="font-display text-[1.9rem] font-black uppercase tracking-[-0.05em] text-black">
                  {subscriptionActionsEnabled
                    ? "Plans"
                    : "Preview"}
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={
                  subscriptionActionsEnabled
                    ? () => scrollToSection("membership-plans")
                    : handleLaunchAccess
                }
                className={primaryButtonClass}
              >
                {subscriptionActionsEnabled ? "Plans" : launchAccessLabel}
              </button>
              <button
                type="button"
                onClick={() => router.push("/store")}
                className={secondaryButtonClass}
              >
                {STOREFRONT_TERMS.viewPointPacks}
              </button>
              {!isSignedIn && !isActive && subscriptionActionsEnabled ? (
                <button
                  type="button"
                  onClick={openAuthPrompt}
                  className={secondaryButtonClass}
                >
                  Sign in
                </button>
              ) : null}
            </div>
          </SurfacePanel>
        </section>

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                Overview
              </p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-black">
                  {subscriptionActionsEnabled
                    ? "Monthly plans"
                    : "Membership preview"}
                </h2>
            </div>
          </div>

          {!subscriptionActionsEnabled ? (
            <div className="rounded-[24px] border border-black/10 bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <h3 className="text-xl font-black uppercase tracking-[-0.05em] text-black">
                Coming soon.
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-black/72">
                Plans are visible. Checkout is disabled.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      buildSupportPath({
                        topic: "billing",
                        context: "Membership preview. Checkout disabled.",
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

          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                title: "Today",
                body: subscriptionActionsEnabled
                  ? "Billing starts at checkout."
                  : "Preview only.",
              },
              {
                title: "Billing",
                body: subscriptionActionsEnabled
                  ? "Renews monthly while active."
                  : "Checkout disabled.",
              },
              {
                title: "Receipts",
                body: "See Orders.",
              },
              {
                title: "Help",
                body: "Contact support.",
              },
            ].map((item) => (
              <div key={item.title} className={quietCardClass}>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <h3 className="text-sm font-black uppercase tracking-[0.04em] text-black">
                    {item.title}
                  </h3>
                  <p className="text-sm font-semibold leading-6 text-black/72">
                    {item.body}
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
                    context: "Membership launch or billing question",
                  }),
                )
              }
              className={secondaryButtonClass}
            >
              Support
            </button>
            <button
              type="button"
              onClick={() => router.push("/orders")}
              className={secondaryButtonClass}
            >
              Orders
            </button>
          </div>
        </SurfacePanel>

        {!isSignedIn ? (
          <SurfacePanel className="space-y-4" appearance="light" accent="blue">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-3xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                      {subscriptionActionsEnabled ? "Account" : "Account"}
                    </p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-black">
                  One account.
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openAuthPrompt}
                  className={primaryButtonClass}
                >
                  {subscriptionActionsEnabled ? "Sign in" : "Sign in"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/rankings?type=ttf&window=all")}
                  className={secondaryButtonClass}
                >
                  Start here
                </button>
              </div>
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel
          id="membership-plans"
          className="space-y-6"
          appearance="light"
          accent="blue"
        >
          {feedback ? (
            <div className="rounded-[24px] border border-[#f0b7c8] bg-[#fff3f6] px-4 py-3 text-sm font-semibold text-red-600 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              {feedback}
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                Plans
              </p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-black">
                Plans.
              </h2>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-black/55">
              {isActive
                ? `Current: ${subscription?.planId}`
                : `${SUBSCRIPTION_OFFERS.length} plans`}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {SUBSCRIPTION_OFFERS.map((plan) => {
              const key = plan.id.replace("subscribe_", "");
              const perks = planCatalog?.[key];
              const isBest = bestPlanId === key;
              const isCurrent = isActive && subscription?.planId === key;
              const planBadgeLabel = getPlanBadgeLabel(plan, isBest);
              const priceLabel =
                perks?.price !== undefined
                  ? formatPlanPrice(perks.price, perks.currency || "USD")
                  : plan.price;
              const planNote = isCurrent
                ? "This plan is already active on your account."
                : subscriptionActionsEnabled
                  ? "Monthly while active."
                  : "";

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-[30px] border border-black/10 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition-all duration-300 hover:border-black/15 hover:bg-black/[0.02] ${
                    isBest
                      ? "bg-[#f8f9fb]"
                      : "bg-white"
                  } ${isCurrent ? "ring-1 ring-black/10 shadow-[0_28px_64px_rgba(15,23,42,0.12)]" : ""}`}
                >
                  {isBest ? (
                    <div className="absolute -top-3 left-5 rounded-full border border-black bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
                      Best value
                    </div>
                  ) : null}

                  <div className="space-y-5 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                            isBest
                            ? "border border-black/10 bg-white text-black"
                            : "border border-black/10 bg-[#f6f7fb] text-black"
                          }`}
                        >
                          {getPlanIcon(plan.id)}
                        </div>
                        <div>
                          {planBadgeLabel ? (
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                              {planBadgeLabel}
                            </p>
                          ) : null}
                          <h3 className="mt-2 font-display text-3xl font-black uppercase tracking-[-0.05em] text-black">
                            {plan.title}
                          </h3>
                          <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-black/72">
                            {PLAN_FIT_GUIDE[key]?.description || ""}
                          </p>
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full border border-black/10 bg-[#f6f7fb] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
                          Active
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2 border-t border-black/8 pt-5">
                      <div className="flex items-end gap-2">
                        <span className="font-display text-4xl font-black uppercase tracking-[-0.05em] text-black">
                          {priceLabel}
                        </span>
                        <span className="pb-1 text-sm font-semibold uppercase tracking-[0.08em] text-black/55">
                          /month
                        </span>
                      </div>
                      {perks?.discountPct ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f6f7f9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-black">
                          <Zap className="h-3.5 w-3.5 text-black/60" />
                          Save {perks.discountPct}% on unlocks
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3 border-t border-black/8 pt-5 text-sm text-black/72">
                      <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                          Fit
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-black/72">
                          {PLAN_FIT_GUIDE[key]?.title || "Recurring readers"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(29,29,31,0.04)]">
                          <Check className="h-3 w-3 text-black" />
                        </div>
                        <span>
                          <span className="font-black uppercase tracking-[0.04em] text-black">
                            {perks?.dailyFreeUnlocks ?? "-"}
                          </span>{" "}
                          free reads a day
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(29,29,31,0.04)]">
                          <Check className="h-3 w-3 text-black" />
                        </div>
                        <span>
                          <span className="font-black uppercase tracking-[0.04em] text-black">
                            {perks?.ttfMultiplier
                              ? `${Math.round(perks.ttfMultiplier * 100)}%`
                              : "-"}
                          </span>{" "}
                          of the normal wait
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(29,29,31,0.04)]">
                          <Check className="h-3 w-3 text-black" />
                        </div>
                        <span>
                          <span className="font-black uppercase tracking-[0.04em] text-black">
                            {perks?.voucherPts ?? "-"}
                          </span>{" "}
                          monthly points
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(29,29,31,0.04)]">
                          <Check className="h-3 w-3 text-black" />
                        </div>
                          <span>Better for frequent unlocks</span>
                      </div>
                    </div>

                    {!subscriptionPrelaunch ? (
                      <button
                        type="button"
                        onClick={() => handleSubscribe(key)}
                        disabled={
                          workingId === key ||
                          isCurrent ||
                          !subscriptionActionsEnabled
                        }
                        className={primaryButtonClass}
                      >
                        {isCurrent
                          ? "Current plan"
                          : !isSignedIn
                            ? "Sign in"
                            : workingId === key
                              ? "Processing..."
                              : "Choose plan"}
                      </button>
                    ) : null}
                    {planNote ? (
                      <p className="text-xs font-semibold leading-5 text-black/58">
                        {planNote}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </SurfacePanel>

        <details className={compareShellClass}>
          <summary className="cursor-pointer list-none px-4 py-4 text-sm font-black uppercase tracking-[0.06em] text-black">
            Compare plans
          </summary>
          <div className="border-t border-[color:var(--gush-border)] px-4 py-4">
            <div className="space-y-3 sm:hidden">
              {planComparisonRows.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-[20px] border border-black/10 bg-white px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black uppercase tracking-[0.04em] text-black">
                      {plan.title}
                    </p>
                    <span className="text-sm font-black uppercase tracking-[0.04em] text-black">
                      {plan.priceLabel}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm font-semibold text-black/72">
                    <p>{plan.bestFor}</p>
                    <p>{plan.dailyFreeUnlocks} free reads / day</p>
                    <p>{plan.waitTimeLabel} of the normal wait</p>
                    <p>{plan.monthlyPoints} monthly points</p>
                    <p>{plan.savingsLabel} on unlocks</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-black/60">
                    <th className="pb-4 font-semibold">Feature</th>
                    {SUBSCRIPTION_OFFERS.map((plan) => (
                      <th
                        key={plan.id}
                        className="pb-4 text-center font-black uppercase tracking-[0.04em] text-black"
                      >
                        {plan.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  <tr>
                    <td className="py-4 font-semibold text-black/72">Free Reads / Day</td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog?.[key];
                      return (
                        <td
                          key={plan.id}
                          className="py-4 text-center font-black uppercase tracking-[0.04em] text-black"
                        >
                          {perks?.dailyFreeUnlocks ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 font-semibold text-black/72">Wait Time</td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog?.[key];
                      return (
                        <td
                          key={plan.id}
                          className="py-4 text-center font-black uppercase tracking-[0.04em] text-black"
                        >
                          {perks?.ttfMultiplier
                            ? `${Math.round(perks.ttfMultiplier * 100)}%`
                            : "-"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 font-semibold text-black/72">Monthly points</td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog?.[key];
                      return (
                        <td
                          key={plan.id}
                          className="py-4 text-center font-black uppercase tracking-[0.04em] text-black"
                        >
                          {perks?.voucherPts ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 font-semibold text-black/72">Savings</td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog?.[key];
                      return (
                        <td key={plan.id} className="py-4 text-center">
                          {perks?.discountPct ? (
                            <span className="font-black uppercase tracking-[0.04em] text-black">
                              {perks.discountPct}%
                            </span>
                          ) : (
                            <span className="text-black/40">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </details>

        {isActive ? (
          <SurfacePanel
            className="border-[color:var(--gush-border-strong)]"
            appearance="light"
            accent="blue"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                  Active membership
                </p>
                <h3 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-black">
                  {subscription?.planId}
                </h3>
                <p className="mt-2 text-sm font-semibold text-black/68">
                  {subscription?.renewAt
                    ? `Renews on ${formatUSDate(subscription.renewAt)}`
                    : "Renewal date is not available yet."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={workingId === "cancel"}
                className={secondaryButtonClass}
              >
                {!subscriptionActionsEnabled
                  ? "Support"
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
