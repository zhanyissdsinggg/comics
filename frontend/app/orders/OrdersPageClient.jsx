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
          ? "Use your latest purchase while it is still fresh."
          : "Jump back into reading from your latest order.",
        description: latestPaidOrder
          ? latestOrderGuide.description
          : "Your latest order should help you get back to reading, not just sit in your history.",
        cta: latestOrderGuide.nextCta,
        onClick: () => router.push(latestOrderGuide.nextHref),
        accentClass:
          "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
      },
      {
        id: "membership",
        eyebrow: "Plans",
        title: "Compare plans before you buy more points.",
        description:
          "If you read often, compare membership against one-off spending before your next purchase.",
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
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "store",
        eyebrow: "Point packs",
        title: "Need more points? Start here.",
        description:
          "Keep point packs close to your receipts so it is easy to top up when you are ready.",
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
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "support",
        eyebrow: "Help",
        title: latestPaidOrder
          ? `Need help with ${latestPaidOrder.orderId}?`
          : "Need help with an order?",
        description:
          "Contact support with the order ID so billing questions start with the right receipt.",
        cta: STOREFRONT_TERMS.billingSupport,
        onClick: () => router.push("/support"),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
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
      ? "..."
      : singleCurrency
        ? formatOrderAmount(totalAmount, singleCurrency)
        : currencies.length > 1
          ? "Multiple"
          : formatUSCurrency(0);

    return [
      {
        label: "Orders",
        value: loading ? "..." : orders.length.toLocaleString(),
        hint: isSignedIn ? "Purchase history loaded from your account." : "Sign in to load receipts and refunds.",
      },
      {
        label: "Paid",
        value: loading ? "..." : paidCount.toLocaleString(),
        hint: "Orders still eligible for refund review.",
      },
      {
        label: "Refunds",
        value: loading ? "..." : refundedCount.toLocaleString(),
        hint: "Orders already moved into a refund state.",
      },
      {
        label: "Spent",
        value: totalSpentLabel,
        hint:
          currencies.length > 1
            ? "Multiple currencies appear in your loaded receipts."
            : "Visible order total across the receipts on this page.",
      },
    ];
  }, [isSignedIn, loading, orders]);

  const secondaryButtonClass =
    "rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Orders"
          title={
            latestPaidOrder
              ? "See receipts, refund status, and what to do next."
              : "View receipts, payment status, and refund requests in one place."
          }
          description={
            latestPaidOrder
              ? "Check your latest purchase, compare plans, and get billing help without leaving the order page."
              : "Scan recent purchases quickly, refresh payment status, and review refunds without jumping through settings."
          }
          secondary={
            latestPaidOrder
              ? `Latest paid receipt: ${latestPaidOrder.orderId} | ${formatOrderAmount(latestPaidOrder.amount, latestPaidOrder.currency)}`
              : "Order status refreshes are available here whenever you want to check for updates."
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
                    setFeedback({ type: "success", text: "Order status updated." });
                  } else {
                    setFeedback({
                      type: "error",
                      text: getFriendlyMessage(response.error, response.message || "Refresh failed."),
                    });
                  }
                  setWorkingId("");
                }}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hydrated || !isSignedIn || workingId === "refresh"}
              >
                {workingId === "refresh" ? "Refreshing..." : "Refresh status"}
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
            className={
              feedback.type === "error"
                ? "border border-red-500/40 bg-red-500/10 text-red-100"
                : "border border-white/10 bg-emerald-500/10"
            }
          >
            <p className="text-sm text-neutral-100">{feedback.text}</p>
          </SurfacePanel>
        ) : null}

        {isSignedIn && refundPreviewOnly ? (
          <SurfacePanel className="border border-amber-500/30 bg-amber-500/10 text-amber-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Self-serve refunds are temporarily unavailable</p>
                <p className="text-sm text-amber-100/85">
                  Receipts are still visible here, but refund requests stay locked until secure billing is fully enabled.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/support")}
                className={secondaryButtonClass}
              >
                Contact support
              </button>
            </div>
          </SurfacePanel>
        ) : null}

        {hydrated && isSignedIn ? (
          <>
            {latestPaidOrder ? (
              <SurfacePanel className="space-y-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                      What to do next
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                      Use your latest purchase right away.
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                      After checkout, readers should be able to jump back into reading, compare plans, or get help
                      without digging through settings.
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                    {latestOrderGuide.eyebrow}
                  </p>
                </div>

                <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
                  <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                      Latest paid receipt
                    </p>
                    <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
                      {latestOrderGuide.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-neutral-300">{latestOrderGuide.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-neutral-300">
                      <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1">
                        {latestPaidOrder.packageId}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1">
                        {formatOrderAmount(latestPaidOrder.amount, latestPaidOrder.currency)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1">
                        Paid {formatOrderDate(latestPaidOrder.createdAt)}
                      </span>
                      {hasRecentPaidOrder ? (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-200">
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
                  />
                </div>
              </SurfacePanel>
            ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <SurfacePanel className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Refunds
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                  Know what can be refunded.
                </h2>
              </div>
              <ul className="space-y-3 text-sm leading-6 text-neutral-300">
                <li>Only paid orders can be reviewed for refunds.</li>
                <li>Self-serve refunds depend on billing availability and whether the purchased points have already been used.</li>
                <li>If self-serve refunds are unavailable, support is the next step.</li>
              </ul>
            </SurfacePanel>

            <SurfacePanel className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Need help?
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                  Keep the order ID with your message.
                </h2>
              </div>
              <p className="text-sm leading-6 text-neutral-300">
                Refresh this page after checkout, then include the order ID when you contact support so the team can
                start from the right receipt.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/support")}
                  className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  Contact support
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
          <SurfacePanel>
            <p className="text-sm text-neutral-400">Pulling your receipts...</p>
          </SurfacePanel>
        ) : !isSignedIn ? (
          <SurfacePanel className="space-y-4">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
              Sign in to view your orders
            </h2>
            <p className="text-sm leading-6 text-neutral-300">
              Receipts and refund actions are tied to your account, so you will need to sign in first.
            </p>
            <button
              type="button"
              onClick={() => router.push("/signin?returnTo=/orders")}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
            >
              Sign in
            </button>
          </SurfacePanel>
        ) : orders.length === 0 ? (
          <SurfacePanel>
            <p className="text-sm text-neutral-400">No purchases yet. When you buy points or membership, the receipts will appear here.</p>
          </SurfacePanel>
        ) : (
          <SurfacePanel className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Order history
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  Order timeline
                </h2>
              </div>
              <p className="text-xs text-neutral-500">{orders.length} entries loaded</p>
            </div>

            <div className="space-y-3">
              {orders.map((order) => {
                const orderGuide = getCommerceJourneyGuide(order.packageId);

                return (
                  <div
                    key={order.orderId}
                    className="rounded-[24px] border border-white/10 bg-black/10 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{order.packageId}</p>
                        <p className="mt-2 text-xs text-neutral-400">
                          {formatOrderAmount(order.amount, order.currency)} - {order.orderId}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-300">
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-400">
                      <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1">
                        {orderGuide.eyebrow}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1">
                        Placed {formatOrderDate(order.createdAt)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1">
                        Receipt synced to account
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1">
                        Use {order.orderId} for support follow-up
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-neutral-300">{orderGuide.description}</p>
                    <p className="mt-3 text-sm leading-6 text-neutral-400">
                      {order.status === "PAID"
                        ? refundActionsEnabled
                          ? "You can request a refund here while secure billing is active. Approval still depends on the order status and whether the purchased points have been used."
                          : "This receipt is still valid, but refund requests currently go through support until secure billing actions are enabled."
                        : "Any status changes stay attached to this receipt so you can track the order over time."}
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
                              setFeedback({ type: "success", text: "Refund requested." });
                            } else {
                              setFeedback({
                                type: "error",
                                text: getFriendlyMessage(response.error, response.message || "Refund failed."),
                              });
                            }
                            setWorkingId("");
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            workingId === order.orderId
                              ? "cursor-not-allowed bg-neutral-700 text-neutral-300"
                              : "bg-white text-neutral-950 hover:bg-neutral-200"
                          }`}
                          disabled={workingId === order.orderId}
                        >
                          {workingId === order.orderId ? "Requesting..." : "Request refund"}
                        </button>
                      ) : order.status === "PAID" ? (
                        <button
                          type="button"
                          onClick={() => router.push("/support")}
                          className="rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/10"
                        >
                          {STOREFRONT_TERMS.billingSupport}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => router.push(orderGuide.nextHref)}
                        className="rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/10"
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
