"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Gift, Sparkles, Star, Zap } from "lucide-react";
import SiteHeader from "../layout/SiteHeader";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import StorefrontPathwaysGrid from "../common/StorefrontPathwaysGrid";
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
import { formatUSCurrency } from "../../lib/localization";

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

  const subscriptionActionsFlag = billingAvailability?.subscriptionActionsEnabled;
  const subscriptionActionsEnabled = subscriptionActionsFlag === true;
  const subscriptionPreviewOnly = subscriptionActionsFlag === false;
  const subscriptionStateUnknown = typeof subscriptionActionsFlag !== "boolean";

  const handleSubscribe = async (planId) => {
    if (!isSignedIn) {
      setFeedback("Sign in first so membership, receipts, and renewal history stay on one account.");
      openAuthPrompt();
      return;
    }

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
        label: "Status",
        value: isActive ? "Active" : subscriptionActionsEnabled ? "Live" : subscriptionPreviewOnly ? "Preview" : "Checking",
        hint: isActive
          ? `${subscription?.planId || "Membership"} is active on this account.`
          : subscriptionActionsEnabled
            ? "Pick a tier when you want lower prices, free reads, and monthly points."
            : subscriptionPreviewOnly
              ? "Compare tiers here now. Starting membership opens when billing is live."
              : "Plan comparison is available, but activation status is still loading from billing.",
      },
      {
        label: "Best for",
        value: "Frequent readers",
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
          ? `Renews ${new Date(subscription.renewAt).toLocaleDateString()}`
          : "Monthly recurring",
        hint: subscription?.renewAt
          ? "Cancel before the renewal date if you want the plan to stop."
          : "Receipts and future charges stay in Purchases after checkout.",
      },
    ];
  }, [
    isActive,
    planCatalog,
    subscription?.planId,
    subscription?.renewAt,
    subscriptionActionsEnabled,
    subscriptionPreviewOnly,
    subscriptionStateUnknown,
  ]);

  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-50";

  const membershipActionCards = useMemo(
    () => [
      {
        id: "point-packs",
        eyebrow: "Point packs",
        title: "Need flexible unlocks instead of a monthly plan?",
        description:
          "Store is the better fit when you want one-time packs rather than a recurring membership charge.",
        cta: STOREFRONT_TERMS.viewPointPacks,
        onClick: () => router.push("/store"),
        accentClass:
          "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
      },
      {
        id: "purchases",
        eyebrow: "Purchases",
        title: "Find receipts, renewals, and order IDs in one place.",
        description:
          "Membership charges show up in Purchases after checkout so billing history stays easy to verify later.",
        cta: "View purchases",
        onClick: () => router.push("/orders"),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "account",
        eyebrow: "Account",
        title: isSignedIn ? "Manage membership, recovery, and reading setup together." : "Sign in before you start a plan.",
        description: isSignedIn
          ? "Account keeps billing, recovery, mature-content controls, and reading settings together without a settings dump."
          : "Membership should belong to one account so receipts, renewals, and cancellation history do not get stranded on one browser.",
        cta: isSignedIn ? "Open account" : "Sign in",
        onClick: () => {
          if (isSignedIn) {
            router.push("/account");
            return;
          }
          openAuthPrompt();
        },
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "support",
        eyebrow: "Billing help",
        title: subscriptionPreviewOnly
          ? "Need help while membership is still preview-only?"
          : subscriptionStateUnknown
            ? "Need help while membership status is still unavailable?"
          : "Know where billing help lives before you subscribe.",
        description: subscriptionPreviewOnly
          ? "Support is the fallback if launch timing, preview-state rules, or account setup still need clarification."
          : subscriptionStateUnknown
            ? "Use Support if activation status, billing setup, or account readiness still looks unclear."
          : "Use Support for wrong charges, missing access, cancellation questions, or anything that feels off after checkout.",
        cta: "Billing help",
        onClick: () =>
          router.push(buildSupportPath({ topic: "billing", context: "Membership billing help or preview question" })),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ],
    [isSignedIn, router, subscriptionPreviewOnly, subscriptionStateUnknown],
  );
  const membershipDecisionCards = useMemo(
    () => [
      {
        eyebrow: subscriptionPreviewOnly ? "Preview" : subscriptionStateUnknown ? "Status" : "Recurring monthly",
        title: subscriptionPreviewOnly
          ? "Plans are live to compare while activation stays paused."
          : subscriptionStateUnknown
            ? "Plan pricing is visible while activation status is still unavailable."
          : "Membership renews monthly while the plan stays active.",
        description: subscriptionPreviewOnly
          ? "Use this page to compare tiers now, then come back when starting a plan is available."
          : subscriptionStateUnknown
            ? "Use this page to compare tiers now, then check back once activation status resolves cleanly."
          : "Cancel before the listed renewal date if you do not want the next monthly charge.",
      },
      {
        eyebrow: "Point packs",
        title: "Use Store if you unlock only once in a while.",
        description:
          "Point packs fit casual reading better. Membership is the stronger fit when repeated top-ups start feeling heavier than one plan.",
      },
      {
        eyebrow: "Receipts & help",
        title: "Purchases and Support should answer the follow-up fast.",
        description:
          "Renewals, receipts, and charges stay in Purchases. Billing, cancellation, and missing-access issues route through Support.",
      },
    ],
    [subscriptionPreviewOnly, subscriptionStateUnknown],
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
            subscriptionActionsEnabled
              ? "Membership is billed monthly while active. Choose it if you read often and want lower unlock prices, free reads, and monthly points."
              : subscriptionPreviewOnly
              ? "Compare every monthly tier now. Membership is the recurring option for regular readers once checkout goes live."
              : "Plan pricing and perks are visible now. While activation status is unavailable, use this page to compare monthly membership against one-time point packs."
          }
          secondary={
            subscriptionActionsEnabled
              ? "Cancel before renewal if you want the plan to stop."
              : subscriptionPreviewOnly
              ? "Plans are live to compare. Starting is still paused for now."
              : "Plan comparison is available, but activation status has not resolved yet."
          }
          stats={subscriptionHeroStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => scrollToSection("membership-plans")}
                className={primaryButtonClass}
              >
                {subscriptionActionsEnabled ? "Compare plans" : subscriptionPreviewOnly ? "Compare plans" : "See plans"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/store")}
                className={secondaryButtonClass}
              >
                {STOREFRONT_TERMS.viewPointPacks}
              </button>
              {!isSignedIn && !isActive ? (
                <button type="button" onClick={openAuthPrompt} className={secondaryButtonClass}>
                  Sign in
                </button>
              ) : null}
            </>
          }
        />

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Before you subscribe
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                The billing rules should be obvious before you start a plan.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                This page is for recurring monthly membership. Point packs stay on the Store page, and charges or renewals appear in Purchases after checkout.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Recurring monthly billing",
                body: subscriptionPreviewOnly
                  ? "Starting membership is paused right now, but this page still reflects the recurring monthly model."
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
              {
                title: "Your account history stays intact",
                body: "Membership receipts stay on the account after a plan ends. Ongoing access follows the rules of each plan or purchase.",
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
                  Sign in first
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Membership belongs to your account, not just this browser.
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Sign in before you start a plan so renewals, receipts, cancellation, and support all stay attached to one account.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={openAuthPrompt} className={primaryButtonClass}>
                  Sign in
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

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              What do you need next?
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
              Use Membership like a task page, not a compare-only page.
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Compare point packs, check purchases, open account, or get billing help without losing the membership path.
            </p>
          </div>
          <StorefrontPathwaysGrid
            cards={membershipActionCards}
            columnsClassName="md:grid-cols-2 xl:grid-cols-4"
            appearance="light"
          />
        </SurfacePanel>

        <SurfacePanel id="membership-plans" className="space-y-6" appearance="light" accent="blue">
          {feedback ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {feedback}
            </div>
          ) : null}
          {subscriptionPreviewOnly ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Starting membership is not live yet. Use this page to compare tiers, then browse free starts or point packs while checkout is still paused.
            </div>
          ) : subscriptionStateUnknown ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Membership billing status is unavailable right now. You can still compare tiers, point packs, and support paths while activation status catches up.
            </div>
          ) : null}

          {subscriptionPreviewOnly || subscriptionStateUnknown ? (
            <div className="flex flex-wrap gap-3">
              {!isSignedIn ? (
                <button type="button" onClick={openAuthPrompt} className={secondaryButtonClass}>
                  Sign in ahead of launch
                </button>
              ) : null}
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
                  ? formatPlanPrice(perks.price, perks.currency || "USD")
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
                        : subscriptionStateUnknown
                          ? "Status unavailable"
                          : !subscriptionActionsEnabled
                          ? "Compare plan"
                          : !isSignedIn
                            ? "Sign in to start"
                            : workingId === key
                              ? "Processing..."
                              : "Pick this plan"}
                    </button>
                    <p className="text-xs leading-5 text-slate-500">
                      Recurring monthly billing while active, with receipts in Purchases and billing help in Support.
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
                  ? "Need help?"
                  : workingId === "cancel"
                    ? "Canceling..."
                    : "Cancel plan"}
              </button>
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Compare the paths
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Membership is monthly. Point packs stay flexible. Help should stay obvious.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Pick membership when you read often, use point packs when you unlock occasionally, and keep Purchases plus Support close when billing questions show up later.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/store")}
                className={primaryButtonClass}
              >
                {STOREFRONT_TERMS.viewPointPacks}
              </button>
              {subscriptionPreviewOnly || subscriptionStateUnknown ? (
                <button
                  type="button"
                  onClick={() => router.push("/rankings?type=ttf&window=all")}
                  className={secondaryButtonClass}
                >
                  Browse free starts
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {membershipDecisionCards.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-black/6 bg-white/84 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
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
      </main>
    </div>
  );
}
