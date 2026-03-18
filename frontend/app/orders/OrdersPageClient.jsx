"use client";

import { useEffect, useMemo, useState } from "react";
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

function buildSupportHref(orderId) {
  if (!orderId) {
    return "/support";
  }

  const params = new URLSearchParams({ orderId });
  return `/support?${params.toString()}`;
}

export default function OrdersPageClient() {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [billingAvailability, setBillingAvailability] = useState(null);
  const [commerceNotice, setCommerceNotice] = useState(null);

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

    if (!isSignedIn) {
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
  }, [hydrated, isSignedIn]);

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

  const orderStats = useMemo(() => {
    const paidCount = orders.filter((order) => order.status === "PAID").length;
    const refundedCount = orders.filter((order) => String(order.status).includes("REFUND")).length;
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const currencies = Array.from(
      new Set(orders.map((order) => String(order.currency || "").toUpperCase()).filter(Boolean)),
    );
    const singleCurrency = currencies.length === 1 ? currencies[0] : "";
    const totalSpentLabel = loading
      ? "--"
      : singleCurrency
        ? formatOrderAmount(totalAmount, singleCurrency)
        : currencies.length > 1
          ? "Multiple"
          : formatUSCurrency(0);

    return [
      {
        label: "Orders",
        value: loading ? "--" : orders.length.toLocaleString(),
        hint: isSignedIn ? "Saved to your account." : "Sign in to see your saved purchases.",
      },
      {
        label: "Paid",
        value: loading ? "--" : paidCount.toLocaleString(),
        hint: "Completed purchases in your history.",
      },
      {
        label: "Refunds",
        value: loading ? "--" : refundedCount.toLocaleString(),
        hint: "Orders already moving through a refund.",
      },
      {
        label: "Spent",
        value: totalSpentLabel,
        hint:
          currencies.length > 1
            ? "Loaded in more than one currency."
            : "Visible total for the purchases on this page.",
      },
    ];
  }, [isSignedIn, loading, orders]);

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
              : "Your purchases, receipts, and order IDs."
          }
          description={
            latestPaidOrder
              ? "Your latest purchase is here, along with quick ways to keep reading or get help."
              : "Point packs and memberships show up here so you can check receipts, charges, and billing details without digging through settings."
          }
          secondary={
            latestPaidOrder
              ? `Latest order: ${latestPaidOrder.orderId} | ${formatOrderAmount(latestPaidOrder.amount, latestPaidOrder.currency)}`
              : "New purchases usually appear here shortly after checkout."
          }
          stats={orderStats}
          actions={
            <>
              <button
                type="button"
                onClick={async () => {
                  if (!isSignedIn) {
                    router.push("/signin?returnTo=/orders");
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
                }}
                className={primaryButtonClass}
                disabled={!hydrated || !isSignedIn || workingId === "refresh"}
              >
                {workingId === "refresh" ? "Updating..." : "Refresh purchases"}
              </button>
              <button
                type="button"
                onClick={() => router.push(isSignedIn ? "/account" : "/signin?returnTo=/orders")}
                className={secondaryButtonClass}
              >
                {isSignedIn ? "Account" : "Sign in"}
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

        {isSignedIn && refundPreviewOnly ? (
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

        {hydrated && isSignedIn ? (
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

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Refunds
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Not every purchase can be refunded.
                </h2>
              </div>
              <ul className="space-y-3 text-sm leading-6 text-slate-600">
                <li>Only completed purchases can be reviewed.</li>
                <li>If points from the purchase were already used, it may no longer qualify.</li>
                <li>If you do not see a refund button, send us a message with the order ID.</li>
              </ul>
            </SurfacePanel>

            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Need help?
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Keep the order ID handy.
                </h2>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                If a charge looks wrong, send us a message and include the order ID so we can start in the right place.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push(buildSupportHref(latestPaidOrder?.orderId))}
                  className={primaryButtonClass}
                >
                  Get help
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/account")}
                  className={secondaryButtonClass}
                >
                  Account
                </button>
              </div>
            </SurfacePanel>
          </div>
          </>
        ) : null}

        {!hydrated || loading ? (
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
            <p className="text-sm leading-6 text-slate-500">
              Receipts, order IDs, and recent charges are loading now.
            </p>
          </SurfacePanel>
        ) : !isSignedIn ? (
          <SurfacePanel className="space-y-4" appearance="light" accent="blue">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
              Sign in to view your purchases
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Purchases live on your account, so you will need to sign in first. This is also where you will find receipts, order IDs, and membership charges.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/signin?returnTo=/orders")}
                className={primaryButtonClass}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => router.push("/how-it-works")}
                className={secondaryButtonClass}
              >
                How it works
              </button>
              <button
                type="button"
                onClick={() => router.push("/support")}
                className={secondaryButtonClass}
              >
                Support
              </button>
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
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/how-it-works")}
                className={primaryButtonClass}
              >
                How points work
              </button>
              <button
                type="button"
                onClick={() => router.push("/store")}
                className={secondaryButtonClass}
              >
                See point packs
              </button>
              <button
                type="button"
                onClick={() => router.push("/support")}
                className={secondaryButtonClass}
              >
                Billing help
              </button>
            </div>
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
