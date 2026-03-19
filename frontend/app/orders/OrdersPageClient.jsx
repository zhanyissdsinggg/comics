"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import CommerceSuccessBanner from "../../components/common/CommerceSuccessBanner";
import StorefrontPathwaysGrid from "../../components/common/StorefrontPathwaysGrid";
import { apiGet, apiPost } from "../../lib/apiClient";
import { getFriendlyMessage } from "../../lib/errorMessages";
import { formatUSCurrency } from "../../lib/localization";
import { useAuthStore } from "../../store/useAuthStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { getCommerceJourneyGuide, STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import { buildSupportPath } from "../../lib/supportRouting";

function formatOrderAmount(amount, currency) {
  const numericAmount = Number(amount || 0);
  const normalizedCurrency = String(currency || "USD").toUpperCase();
  if (normalizedCurrency === "USD") {
    return formatUSCurrency(numericAmount);
  }
  return `${normalizedCurrency} ${numericAmount.toFixed(2)}`;
}

function formatOrderDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isRecentOrder(value, maxAgeDays = 5) {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= maxAgeDays * 24 * 60 * 60 * 1000;
}

function buildSupportHref(orderId, topic = "billing") {
  return buildSupportPath({
    topic,
    orderId,
    context: orderId ? `Purchase issue for ${orderId}` : "Purchase or billing question",
  });
}

export default function OrdersPageClient({ initialSignedIn = false }) {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [billingAvailability, setBillingAvailability] = useState(null);
  const [commerceNotice, setCommerceNotice] = useState(null);
  const viewerSignedIn = hydrated ? isSignedIn : initialSignedIn;

  useEffect(() => {
    let mounted = true;

    apiGet("/api/billing/topups").then((response) => {
      if (!mounted || !response.ok) {
        return;
      }
      setBillingAvailability(response.data?.billing || null);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!hydrated) {
      setLoading(true);
      return () => {
        mounted = false;
      };
    }

    if (!viewerSignedIn) {
      setOrders([]);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    apiGet("/api/orders", { suppressAuthModal: true }).then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok) {
        setOrders(response.data?.orders || []);
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [hydrated, viewerSignedIn]);

  useEffect(() => {
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/orders")));
  }, []);

  const refundActionsEnabled = billingAvailability?.refundActionsEnabled === true;
  const refundPreviewOnly = billingAvailability?.refundActionsEnabled === false;
  const latestPaidOrder = useMemo(
    () => orders.find((order) => order.status === "PAID") || null,
    [orders],
  );
  const latestOrderGuide = useMemo(
    () => getCommerceJourneyGuide(latestPaidOrder?.packageId),
    [latestPaidOrder?.packageId],
  );
  const hasRecentPaidOrder = Boolean(latestPaidOrder?.createdAt && isRecentOrder(latestPaidOrder.createdAt));
  const signInToOrders = useCallback(() => {
    router.push("/signin?returnTo=/orders");
  }, [router]);
  const refreshOrders = useCallback(async () => {
    if (!viewerSignedIn) {
      signInToOrders();
      return;
    }

    setWorkingId("refresh");
    const response = await apiGet("/api/orders", {
      suppressAuthModal: true,
      bust: true,
      dedupeMs: 0,
    });
    if (response.ok) {
      setOrders(response.data?.orders || []);
      setFeedback({ type: "success", text: "Purchase list updated." });
    } else {
      setFeedback({
        type: "error",
        text: getFriendlyMessage(response.error, response.message || "Refresh failed."),
      });
    }
    setWorkingId("");
  }, [signInToOrders, viewerSignedIn]);
  const postPurchaseCards = useMemo(
    () => [
      {
        id: "resume",
        eyebrow: latestOrderGuide.eyebrow,
        title: hasRecentPaidOrder
          ? "Go use your latest purchase."
          : "Jump back into reading.",
        description: latestPaidOrder
          ? latestOrderGuide.description
          : "Your latest purchase should point you back to a series, not just sit in a list.",
        cta: latestOrderGuide.nextCta,
        onClick: () => router.push(latestOrderGuide.nextHref),
        accentClass:
          "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
      },
      {
        id: "membership",
        eyebrow: "Plans",
        title: "Read often? Compare membership.",
        description:
          "If you keep buying packs, membership may be the better fit before your next purchase.",
        cta: STOREFRONT_TERMS.compareMembership,
        onClick: () =>
          router.push(
            buildPathWithAttribution("/subscribe", {
              entryPoint: "ORDERS_POST_PURCHASE",
              sourcePath: "/orders",
              returnTo: "/orders",
            }),
          ),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "store",
        eyebrow: "Point packs",
        title: "Need a quick top-up?",
        description:
          "Grab another pack when you are ready to unlock more chapters.",
        cta: STOREFRONT_TERMS.viewPointPacks,
        onClick: () =>
          router.push(
            buildPathWithAttribution(
              "/store",
              {
                entryPoint: "ORDERS_POST_PURCHASE",
                sourcePath: "/orders",
                returnTo: "/orders",
              },
              { focus: "auto" },
            ),
          ),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "support",
        eyebrow: "Help",
        title: latestPaidOrder
          ? `Something off with ${latestPaidOrder.orderId}?`
          : "Need help with a purchase?",
        description:
          "Send us a message and include the order ID so we can find it faster.",
        cta: "Get help",
        onClick: () => router.push(buildSupportHref(latestPaidOrder?.orderId)),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ],
    [hasRecentPaidOrder, latestOrderGuide, latestPaidOrder, router],
  );
  const signedOutActionCards = useMemo(
    () => [
      {
        id: "signin",
        eyebrow: "Account",
        title: "Sign in and keep every receipt on one account.",
        description:
          "Receipts, membership charges, and order IDs land here after checkout, so sign-in is the cleanest first step.",
        cta: "Sign in",
        onClick: () => router.push("/signin?returnTo=/orders"),
        accentClass:
          "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
      },
      {
        id: "store",
        eyebrow: "Point packs",
        title: "See one-time packs before you buy.",
        description:
          "Store is the faster path when you want flexible unlocks instead of a recurring plan.",
        cta: STOREFRONT_TERMS.viewPointPacks,
        onClick: () => router.push("/store"),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "membership",
        eyebrow: "Membership",
        title: "Compare recurring plans before checkout.",
        description:
          "Membership is the monthly path for frequent readers. Compare it here before your first charge lands.",
        cta: STOREFRONT_TERMS.compareMembership,
        onClick: () =>
          router.push(
            buildPathWithAttribution("/subscribe", {
              entryPoint: "ORDERS_SIGNED_OUT",
              sourcePath: "/orders",
              returnTo: "/orders",
            }),
          ),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "support",
        eyebrow: "Billing help",
        title: "Get help with a missing receipt or wrong charge.",
        description:
          "Use Support when the payment email never arrives, points look off, or a charge needs review.",
        cta: "Get help",
        onClick: () => router.push(buildSupportHref("", "billing")),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ],
    [router],
  );
  const emptyOrderActionCards = useMemo(
    () => [
      {
        id: "packs",
        eyebrow: "Point packs",
        title: "Buy a pack when you only need flexible unlocks.",
        description:
          "A point pack is the one-time option for unlocking chapters without starting a monthly plan.",
        cta: STOREFRONT_TERMS.viewPointPacks,
        onClick: () => router.push("/store"),
        accentClass:
          "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
      },
      {
        id: "membership",
        eyebrow: "Membership",
        title: "Compare monthly plans before your first checkout.",
        description:
          "If you expect to read often, compare membership before you keep buying packs one at a time.",
        cta: STOREFRONT_TERMS.compareMembership,
        onClick: () =>
          router.push(
            buildPathWithAttribution("/subscribe", {
              entryPoint: "ORDERS_EMPTY_STATE",
              sourcePath: "/orders",
              returnTo: "/orders",
            }),
          ),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "how-it-works",
        eyebrow: "How it works",
        title: "See when free starts, points, and membership kick in.",
        description:
          "This is the faster explainer if you want to understand the purchase model before anything shows up here.",
        cta: "How points work",
        onClick: () => router.push("/how-it-works"),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "support",
        eyebrow: "Support",
        title: "Know where to go if the first charge looks wrong.",
        description:
          "Billing help stays useful even before you have a purchase history loaded on this page.",
        cta: "Billing help",
        onClick: () => router.push(buildSupportHref("", "billing")),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ],
    [router],
  );

  const orderStats = useMemo(() => {
    if (loading) {
      return [
        { label: "Receipts", value: "Loading", hint: "Recent charges and order IDs show up here once purchase history finishes loading." },
        { label: "Billing help", value: "Ready", hint: "Support and refund paths stay close to purchase history." },
        { label: "Point packs", value: "Store", hint: "Buy one-time packs when you want flexible unlocks." },
        { label: "Membership", value: "Monthly", hint: "Compare membership if you read often." },
      ];
    }

    if (!viewerSignedIn) {
      return [
        { label: "Receipts", value: "Sign in", hint: "Purchases, renewals, and order IDs stay on your account after checkout." },
        { label: "Billing help", value: "Support", hint: "Use Support when a receipt is missing or a charge looks wrong." },
        { label: "Point packs", value: "One-time", hint: "Store is for flexible unlocks without a monthly charge." },
        { label: "Membership", value: "Monthly", hint: "Membership is the recurring option for readers who unlock often." },
      ];
    }

    return [
      {
        label: "Latest receipt",
        value: latestPaidOrder?.orderId || (orders.length > 0 ? "Recent charge" : "None yet"),
        hint: latestPaidOrder
          ? `Placed ${formatOrderDate(latestPaidOrder.createdAt)}. Keep this order ID handy for billing help.`
          : "Refresh after checkout to pull in receipts and order IDs.",
      },
      {
        label: "Latest charge",
        value: latestPaidOrder
          ? formatOrderAmount(latestPaidOrder.amount, latestPaidOrder.currency)
          : "No charges",
        hint: latestPaidOrder
          ? `${latestPaidOrder.packageId} is the most recent paid order on this account.`
          : "Point packs and membership renewals will both appear here.",
      },
      {
        label: "Billing help",
        value: refundActionsEnabled ? "Support + refunds" : "Support",
        hint: refundActionsEnabled
          ? "Refund requests and charge questions both route from this page."
          : "Use Support for wrong charges, missing points, or missing receipts.",
      },
      {
        label: "Next step",
        value: latestPaidOrder ? latestOrderGuide.nextCta : STOREFRONT_TERMS.viewPointPacks,
        hint: latestPaidOrder
          ? "Keep reading, compare membership, or buy another pack without leaving purchase history."
          : "Store and Membership stay close when you are ready to buy.",
      },
    ];
  }, [latestOrderGuide.nextCta, latestPaidOrder, loading, orders, refundActionsEnabled, viewerSignedIn]);

  const billingTaskCards = useMemo(
    () => [
      {
        id: "receipt",
        eyebrow: "Receipts",
        title: viewerSignedIn
          ? latestPaidOrder
            ? `Receipt ${latestPaidOrder.orderId} is ready.`
            : orders.length > 0
              ? "Refresh to pull in the latest receipt."
              : "Your first receipt will land here."
          : "Sign in to keep receipts on one account.",
        description: viewerSignedIn
          ? latestPaidOrder
            ? "Use the order ID when a charge, receipt, or points balance needs a closer look."
            : "Recent charges and order IDs appear here shortly after checkout."
          : "Receipts, renewals, and order IDs stay on your account after checkout instead of getting stranded on one device.",
        cta: viewerSignedIn ? "Refresh list" : "Sign in",
        onClick: viewerSignedIn ? refreshOrders : signInToOrders,
        accentClass:
          "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
      },
      {
        id: "billing-help",
        eyebrow: "Billing help",
        title: latestPaidOrder
          ? refundActionsEnabled
            ? "Wrong charge or refund question?"
            : `Need help with ${latestPaidOrder.orderId}?`
          : "Missing receipt or charge question?",
        description: refundActionsEnabled
          ? "Completed purchases can still be reviewed here. Support is the fallback when a charge needs a human check."
          : "Use Support for missing receipts, missing points, wrong charges, or anything else that looks off.",
        cta: "Get help",
        onClick: () => router.push(buildSupportHref(latestPaidOrder?.orderId)),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "next",
        eyebrow: "Next step",
        title: latestPaidOrder ? "Need more unlocks or a better fit?" : "Choose packs or membership before checkout.",
        description: latestPaidOrder
          ? "Point packs stay flexible. Membership is the better fit when repeated top-ups start to add up."
          : "Store is the one-time path. Membership is the recurring path for frequent readers.",
        cta: latestPaidOrder ? STOREFRONT_TERMS.compareMembership : STOREFRONT_TERMS.viewPointPacks,
        onClick: () =>
          latestPaidOrder
            ? router.push(
                buildPathWithAttribution("/subscribe", {
                  entryPoint: "ORDERS_BILLING_TASKS",
                  sourcePath: "/orders",
                  returnTo: "/orders",
                }),
              )
            : router.push("/store"),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ],
    [latestPaidOrder, orders.length, refreshOrders, refundActionsEnabled, router, signInToOrders, viewerSignedIn],
  );

  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-50";
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <main className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          appearance="light"
          accent="blue"
          eyebrow="Purchases"
          title={
            latestPaidOrder
              ? "See what you bought and jump back into reading."
              : viewerSignedIn
                ? "Find receipts, fix charges, and keep order IDs close."
                : "Purchases live on your account."
          }
          description={
            latestPaidOrder
              ? "Your latest purchase is here, along with quick ways to keep reading or get help."
              : viewerSignedIn
                ? "Point packs and memberships show up here so you can handle receipts, charges, and billing questions without digging through settings."
                : "Sign in to keep receipts, order IDs, membership charges, and billing help in one place."
          }
          secondary={
            latestPaidOrder
              ? `Latest order: ${latestPaidOrder.orderId} | ${formatOrderAmount(latestPaidOrder.amount, latestPaidOrder.currency)}`
              : viewerSignedIn
                ? "New purchases usually appear here shortly after checkout."
                : "After checkout, this page is where charges, receipts, and order IDs stay easy to find."
          }
          stats={orderStats}
          actions={
            <>
              <button
                type="button"
                onClick={refreshOrders}
                className={primaryButtonClass}
                disabled={viewerSignedIn ? (!hydrated && initialSignedIn) || workingId === "refresh" : false}
              >
                {!viewerSignedIn ? "Sign in" : workingId === "refresh" ? "Refreshing..." : "Refresh purchases"}
              </button>
              <button
                type="button"
                onClick={() =>
                  viewerSignedIn
                    ? router.push(buildSupportHref(latestPaidOrder?.orderId))
                    : router.push(buildSupportHref("", "billing"))
                }
                className={secondaryButtonClass}
              >
                Billing help
              </button>
            </>
          }
        />

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {feedback.text ? (
          <SurfacePanel
            appearance="light"
            accent={feedback.type === "error" ? "rose" : "blue"}
            className={
              feedback.type === "error"
                ? "border border-red-200 bg-red-50 text-red-600"
                : "border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-700"
            }
          >
            <p className={`text-sm ${feedback.type === "error" ? "text-red-600" : "text-slate-700"}`}>{feedback.text}</p>
          </SurfacePanel>
        ) : null}

        {viewerSignedIn && refundPreviewOnly ? (
          <SurfacePanel className="border border-amber-200 bg-amber-50 text-amber-700" appearance="light" tone="warning" accent="amber">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Need help with a charge?</p>
                <p className="text-sm text-amber-700/85">
                  You can still see every purchase here. If something looks off, send us a message and include the order ID.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(buildSupportHref(latestPaidOrder?.orderId))}
                className={secondaryButtonClass}
              >
                Get help
              </button>
            </div>
          </SurfacePanel>
        ) : null}

        {viewerSignedIn && hydrated ? (
          <>
            {latestPaidOrder ? (
              <SurfacePanel className="space-y-5" appearance="light" accent="blue">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Up next
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                      Use your latest purchase right away.
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                      The next move should be obvious: jump back into reading, compare plans, or get help without
                      digging through settings.
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    {latestOrderGuide.eyebrow}
                  </p>
                </div>

                <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
                  <div className="rounded-[28px] border border-[rgba(47,107,255,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,246,255,0.98))] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Latest purchase
                    </p>
                    <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">
                      {latestOrderGuide.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{latestOrderGuide.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span className="rounded-full border border-black/8 bg-white px-3 py-1">
                        {latestPaidOrder.packageId}
                      </span>
                      <span className="rounded-full border border-black/8 bg-white px-3 py-1">
                        {formatOrderAmount(latestPaidOrder.amount, latestPaidOrder.currency)}
                      </span>
                      <span className="rounded-full border border-black/8 bg-white px-3 py-1">
                        Paid {formatOrderDate(latestPaidOrder.createdAt)}
                      </span>
                      {hasRecentPaidOrder ? (
                        <span className="rounded-full border border-[rgba(47,107,255,0.14)] bg-white px-3 py-1 text-[var(--gush-accent,#2f6bff)]">
                          Recent purchase
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <StorefrontPathwaysGrid
                    cards={postPurchaseCards.map((card) => ({
                      ...card,
                      ctaLabel: card.cta,
                    }))}
                    columnsClassName="md:grid-cols-2"
                    appearance="light"
                  />
                </div>
              </SurfacePanel>
            ) : null}

            <SurfacePanel className="space-y-5" appearance="light" accent="blue">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Common billing tasks
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Find the receipt, fix the charge, or choose what to buy next.
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  Purchases should answer the next job quickly instead of making you scan summary tiles first.
                </p>
              </div>
              <StorefrontPathwaysGrid
                cards={billingTaskCards}
                columnsClassName="md:grid-cols-3"
                appearance="light"
              />
              <div className="rounded-[24px] border border-black/8 bg-[#f8f9fc] px-4 py-4 text-sm text-slate-600">
                {refundActionsEnabled
                  ? "Refund requests only appear on purchases that still qualify. If the button is missing or the charge still looks wrong, use billing help and include the order ID."
                  : "Refunds are not self-serve right now. Use billing help and include the order ID if a charge needs review."}
              </div>
            </SurfacePanel>
          </>
        ) : null}

        {!viewerSignedIn ? (
          <SurfacePanel className="space-y-4" appearance="light" accent="blue">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
              Sign in to view your purchases
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Purchases live on your account, so you will need to sign in first. This is also where you will find receipts, order IDs, and membership charges.
            </p>
            <StorefrontPathwaysGrid
              cards={signedOutActionCards}
              columnsClassName="md:grid-cols-2 xl:grid-cols-4"
              appearance="light"
            />
          </SurfacePanel>
        ) : !hydrated || loading ? (
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" aria-hidden="true" />
              <div className="h-9 w-72 animate-pulse rounded-2xl bg-slate-200" aria-hidden="true" />
              <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-200" aria-hidden="true" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-black/8 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                  aria-hidden="true"
                >
                  <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                  <div className="mt-4 h-6 w-40 animate-pulse rounded-2xl bg-slate-200" />
                  <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </SurfacePanel>
        ) : orders.length === 0 ? (
          <SurfacePanel className="space-y-4" appearance="light" accent="blue">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
              No purchases yet.
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Point packs and memberships will show up here after checkout, along with the order ID you may need for billing help.
            </p>
            <StorefrontPathwaysGrid
              cards={emptyOrderActionCards}
              columnsClassName="md:grid-cols-2 xl:grid-cols-4"
              appearance="light"
            />
          </SurfacePanel>
        ) : (
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Purchase history
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Recent purchases
                </h2>
              </div>
              <p className="text-xs text-slate-500">{orders.length} purchases loaded</p>
            </div>

            <div className="space-y-3">
              {orders.map((order) => {
                const orderGuide = getCommerceJourneyGuide(order.packageId);

                return (
                  <div
                    key={order.orderId}
                    className="rounded-[24px] border border-black/8 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{order.packageId}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {formatOrderAmount(order.amount, order.currency)} | {order.orderId}
                        </p>
                      </div>
                      <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1">
                        {orderGuide.eyebrow}
                      </span>
                      <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1">
                        Placed {formatOrderDate(order.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{orderGuide.description}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {order.status === "PAID"
                        ? refundActionsEnabled
                          ? "Keep reading now, or request a refund if this purchase still qualifies."
                          : "Need help with this order? Send us a message and include the order ID."
                        : "Any updates to this purchase will appear here."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {order.status === "PAID" && refundActionsEnabled ? (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!isSignedIn) {
                              router.push("/signin?returnTo=/orders");
                              return;
                            }
                            setWorkingId(order.orderId);
                            const response = await apiPost("/api/payments/refund", {
                              orderId: order.orderId,
                            });
                            if (response.ok) {
                              setOrders((prev) =>
                                prev.map((item) =>
                                  item.orderId === order.orderId ? response.data?.order : item,
                                ),
                              );
                              setFeedback({ type: "success", text: "Refund request sent." });
                            } else {
                              setFeedback({
                                type: "error",
                                text: getFriendlyMessage(response.error, response.message || "Refund request failed."),
                              });
                            }
                            setWorkingId("");
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            workingId === order.orderId
                              ? "cursor-not-allowed bg-slate-300 text-slate-500"
                              : "bg-slate-950 text-white hover:bg-slate-800"
                          }`}
                          disabled={workingId === order.orderId}
                        >
                          {workingId === order.orderId ? "Requesting..." : "Request refund"}
                        </button>
                      ) : order.status === "PAID" ? (
                        <button
                          type="button"
                          onClick={() => router.push(buildSupportHref(order.orderId))}
                          className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                        >
                          Get help
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => router.push(orderGuide.nextHref)}
                        className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                      >
                        {orderGuide.nextCta}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SurfacePanel>
        )}
      </main>
    </div>
  );
}
