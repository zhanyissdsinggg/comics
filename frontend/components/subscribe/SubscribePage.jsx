"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Gift, Sparkles, Star, Zap } from "lucide-react";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
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
import { siteConfig } from "../../lib/siteConfig";

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
    title: "Casual readers",
    description: "",
  },
  pro: {
    title: "Weekly readers",
    description: "",
  },
  vip: {
    title: "Daily readers",
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
    if (!siteConfig.monetization.membershipEnabled) {
      return undefined;
    }

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
  const subscriptionActionsEnabled =
    subscriptionMode.isRealCommerceLive &&
    siteConfig.monetization.checkoutEnabled &&
    siteConfig.monetization.membershipEnabled;
  const subscriptionPrelaunch =
    subscriptionMode.isPrelaunch ||
    !siteConfig.monetization.checkoutEnabled ||
    !siteConfig.monetization.membershipEnabled;
  const pointPacksVisible = siteConfig.monetization.pointPacksEnabled;
  const ordersVisible = siteConfig.monetization.checkoutEnabled;
  const subscriptionAvailabilityLabel = isActive
    ? "Active"
    : subscriptionActionsEnabled
      ? "Live"
      : "Unavailable";
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
      setFeedback("Sign in");
      openAuthPrompt();
      return;
    }

    if (!subscriptionActionsEnabled) {
      setFeedback("Plans are not available right now.");
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
        response.message || "Couldn't update your plan.",
      ),
    );
  };

  const handleCancel = async () => {
    if (!subscriptionActionsEnabled) {
      router.push(
        buildSupportPath({
          topic: "billing",
          context: "Plan cancellation help",
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
          response.message || "Couldn't update your plan.",
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
        value: maxDiscount > 0 ? `${maxDiscount}% off` : "Reader perks",
      },
    ].filter(Boolean);
  }, [
    isActive,
    planCatalog,
    subscriptionAvailabilityLabel,
    subscriptionActionsEnabled,
  ]);

  const primaryButtonClass = `${storefrontPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`;
  const secondaryButtonClass = `${storefrontSecondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`;
  const quietCardClass =
    "rounded-[24px] border-2 border-white/15 bg-black px-4 py-4 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";
  const compareShellClass =
    "overflow-hidden rounded-[30px] border-2 border-white/15 bg-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";

  if (!siteConfig.monetization.membershipEnabled) {
    return (
      <div className="min-h-screen overflow-hidden bg-black text-white">
        <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
          <SurfacePanel className="space-y-5" appearance="dark" accent="blue">
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                Membership
              </p>
              <h1 className="font-display text-[2.2rem] font-black uppercase tracking-[-0.05em] text-white sm:text-[2.8rem]">
                Membership is coming soon
              </h1>
              <p className="max-w-2xl text-sm font-semibold leading-7 text-white/72">
                Plans are not available yet. You can read free chapters now.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/comics" className={primaryButtonClass}>
                Browse Comics
              </Link>
              <Link
                href={buildSupportPath({
                  topic: "billing",
                  context: "Membership is coming soon.",
                })}
                className={secondaryButtonClass}
              >
                Contact Support
              </Link>
            </div>
          </SurfacePanel>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            accent="blue"
            appearance="dark"
            eyebrow="Plans"
            title="Plans"
            description=""
            stats={subscriptionHeroStats}
          />

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="dark"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                Plans
              </p>
              <div>
                <h2 className="font-display text-[1.9rem] font-black uppercase tracking-[-0.05em] text-white">
                  {subscriptionActionsEnabled ? "Plans" : "Plans"}
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
                {subscriptionActionsEnabled ? "See plans" : launchAccessLabel}
              </button>
              {pointPacksVisible ? (
                <button
                  type="button"
                  onClick={() => router.push("/store")}
                  className={secondaryButtonClass}
                >
                  {STOREFRONT_TERMS.viewPointPacks}
                </button>
              ) : null}
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

        <SurfacePanel className="space-y-5" appearance="dark" accent="blue">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                Plans
              </p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
                {subscriptionActionsEnabled ? "Monthly plans" : "Monthly plans"}
              </h2>
            </div>
          </div>

          {!subscriptionActionsEnabled ? (
            <div className="rounded-[24px] border-2 border-white/15 bg-black px-4 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-xl font-black uppercase tracking-[-0.05em] text-white">
                Plans unavailable
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
                Membership checkout is not available right now.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      buildSupportPath({
                        topic: "billing",
                        context: "Membership checkout is unavailable.",
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
                title: "Now",
                body: subscriptionActionsEnabled
                  ? "Starts at checkout."
                  : "Unavailable right now.",
              },
              {
                title: "Billing",
                body: subscriptionActionsEnabled
                  ? "Renews monthly."
                  : "Try again later.",
              },
              {
                title: "Orders",
                body: ordersVisible ? "In Orders." : "Available after launch.",
              },
              {
                title: "Help",
                body: "Billing help.",
              },
            ].map((item) => (
              <div key={item.title} className={quietCardClass}>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <h3 className="text-sm font-black uppercase tracking-[0.04em] text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm font-semibold leading-6 text-white/70">
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
                    context: "Plan launch or billing question",
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

        {!isSignedIn ? (
          <SurfacePanel className="space-y-4" appearance="dark" accent="blue">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                  {subscriptionActionsEnabled ? "Account" : "Account"}
                </p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
                  Sign in
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
                  Trending
                </button>
              </div>
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel
          id="membership-plans"
          className="space-y-6"
          appearance="dark"
          accent="blue"
        >
          {feedback ? (
            <div className="rounded-[24px] border-2 border-[#FF007A] bg-black px-4 py-3 text-sm font-semibold text-[#FF007A] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {feedback}
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                Plans
              </p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
                All plans
              </h2>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
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
                ? "Already active."
                : subscriptionActionsEnabled
                  ? "Renews monthly."
                  : "";

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-[30px] border-2 border-white/15 p-5 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/25 ${
                    isBest ? "bg-[#101010]" : "bg-black"
                  } ${isCurrent ? "ring-1 ring-[#00E5FF]/35" : ""}`}
                >
                  {isBest ? (
                    <div className="absolute -top-3 left-5 rounded-full border-2 border-black bg-[#FF007A] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      Best value
                    </div>
                  ) : null}

                  <div className="space-y-5 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                            isBest
                              ? "border-2 border-black bg-[#00E5FF] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                              : "border-2 border-black bg-[#FFE500] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                          }`}
                        >
                          {getPlanIcon(plan.id)}
                        </div>
                        <div>
                          {planBadgeLabel ? (
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                              {planBadgeLabel}
                            </p>
                          ) : null}
                          <h3 className="mt-2 font-display text-3xl font-black uppercase tracking-[-0.05em] text-white">
                            {plan.title}
                          </h3>
                          <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-white/70">
                            {PLAN_FIT_GUIDE[key]?.description || ""}
                          </p>
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          Active
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2 border-t border-white/10 pt-5">
                      <div className="flex items-end gap-2">
                        <span className="font-display text-4xl font-black uppercase tracking-[-0.05em] text-white">
                          {priceLabel}
                        </span>
                        <span className="pb-1 text-sm font-semibold uppercase tracking-[0.08em] text-white/60">
                          /month
                        </span>
                      </div>
                      {perks?.discountPct ? (
                        <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#00E5FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <Zap className="h-3.5 w-3.5 text-black/70" />
                          Save {perks.discountPct}% on chapters
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3 border-t border-white/10 pt-5 text-sm text-white/70">
                      <div className="rounded-2xl border-2 border-white/15 bg-black px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                          Fit
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
                          {PLAN_FIT_GUIDE[key]?.title || "Recurring readers"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/15 bg-black">
                          <Check className="h-3 w-3 text-[#00E5FF]" />
                        </div>
                        <span>
                          <span className="font-black uppercase tracking-[0.04em] text-white">
                            {perks?.dailyFreeUnlocks ?? "-"}
                          </span>{" "}
                          free reads each day
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/15 bg-black">
                          <Check className="h-3 w-3 text-[#00E5FF]" />
                        </div>
                        <span>
                          <span className="font-black uppercase tracking-[0.04em] text-white">
                            {perks?.ttfMultiplier
                              ? `${Math.round(perks.ttfMultiplier * 100)}%`
                              : "-"}
                          </span>{" "}
                          wait time
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/15 bg-black">
                          <Check className="h-3 w-3 text-[#00E5FF]" />
                        </div>
                        <span>
                          <span className="font-black uppercase tracking-[0.04em] text-white">
                            {perks?.voucherPts ?? "-"}
                          </span>{" "}
                          points each month
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/15 bg-black">
                          <Check className="h-3 w-3 text-[#00E5FF]" />
                        </div>
                        <span>Great for frequent readers</span>
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
                          ? "Current"
                          : !isSignedIn
                            ? "Sign in"
                            : workingId === key
                              ? "Processing..."
                              : "Get plan"}
                      </button>
                    ) : null}
                    {planNote ? (
                      <p className="text-xs font-semibold leading-5 text-white/55">
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
          <summary className="cursor-pointer list-none px-4 py-4 text-sm font-black uppercase tracking-[0.06em] text-white">
            Plan info
          </summary>
          <div className="border-t border-[color:var(--gush-border)] px-4 py-4">
            <div className="space-y-3 sm:hidden">
              {planComparisonRows.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-[20px] border-2 border-white/15 bg-black px-4 py-4 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black uppercase tracking-[0.04em] text-white">
                      {plan.title}
                    </p>
                    <span className="text-sm font-black uppercase tracking-[0.04em] text-white">
                      {plan.priceLabel}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm font-semibold text-white/70">
                    <p>{plan.bestFor}</p>
                    <p>{plan.dailyFreeUnlocks} free reads / day</p>
                    <p>{plan.waitTimeLabel} wait time</p>
                    <p>{plan.monthlyPoints} points / month</p>
                    <p>{plan.savingsLabel} on chapters</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/60">
                    <th className="pb-4 font-semibold">Feature</th>
                    {SUBSCRIPTION_OFFERS.map((plan) => (
                      <th
                        key={plan.id}
                        className="pb-4 text-center font-black uppercase tracking-[0.04em] text-white"
                      >
                        {plan.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr>
                    <td className="py-4 font-semibold text-white/70">
                      Free Reads
                    </td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog?.[key];
                      return (
                        <td
                          key={plan.id}
                          className="py-4 text-center font-black uppercase tracking-[0.04em] text-white"
                        >
                          {perks?.dailyFreeUnlocks ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 font-semibold text-white/70">Wait</td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog?.[key];
                      return (
                        <td
                          key={plan.id}
                          className="py-4 text-center font-black uppercase tracking-[0.04em] text-white"
                        >
                          {perks?.ttfMultiplier
                            ? `${Math.round(perks.ttfMultiplier * 100)}%`
                            : "-"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 font-semibold text-white/70">
                      Points / Month
                    </td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog?.[key];
                      return (
                        <td
                          key={plan.id}
                          className="py-4 text-center font-black uppercase tracking-[0.04em] text-white"
                        >
                          {perks?.voucherPts ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 font-semibold text-white/70">
                      Savings
                    </td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog?.[key];
                      return (
                        <td key={plan.id} className="py-4 text-center">
                          {perks?.discountPct ? (
                            <span className="font-black uppercase tracking-[0.04em] text-white">
                              {perks.discountPct}%
                            </span>
                          ) : (
                            <span className="text-white/35">-</span>
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
            appearance="dark"
            accent="blue"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                  Active plan
                </p>
                <h3 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
                  {subscription?.planId}
                </h3>
                <p className="mt-2 text-sm font-semibold text-white/70">
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
