"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import { apiGet, apiPost } from "../../lib/apiClient";
import { getFriendlyMessage } from "../../lib/errorMessages";
import { formatUSCurrency } from "../../lib/localization";
import { useAuthStore } from "../../store/useAuthStore";

function formatOrderAmount(amount, currency) {
  const numericAmount = Number(amount || 0);
  const normalizedCurrency = String(currency || "USD").toUpperCase();
  if (normalizedCurrency === "USD") {
    return formatUSCurrency(numericAmount);
  }
  return `${normalizedCurrency} ${numericAmount.toFixed(2)}`;
}

export default function OrdersPageClient() {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [billingAvailability, setBillingAvailability] = useState(null);

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

  const refundActionsEnabled = billingAvailability?.refundActionsEnabled === true;
  const refundPreviewOnly = billingAvailability?.refundActionsEnabled === false;

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
        hint: isSignedIn ? "Purchase history loaded from the account ledger." : "Sign in to load receipts and refunds.",
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
          title="View receipts, payment status, and refund requests in one place."
          description="Scan recent purchases quickly, refresh the latest payment state, and review refunds without bouncing through account settings."
          secondary="Order status refreshes are available here whenever you want to check for updates."
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
                {isSignedIn ? "Account Overview" : "Sign in"}
              </button>
            </>
          }
        />

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

        {!hydrated || loading ? (
          <SurfacePanel>
            <p className="text-sm text-neutral-400">Loading orders...</p>
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
            <p className="text-sm text-neutral-400">No purchases yet.</p>
          </SurfacePanel>
        ) : (
          <SurfacePanel className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Ledger
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  Order timeline
                </h2>
              </div>
              <p className="text-xs text-neutral-500">{orders.length} entries loaded</p>
            </div>

            <div className="space-y-3">
              {orders.map((order) => (
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
                      className={`mt-4 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
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
                      className="mt-4 rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/10"
                    >
                      Contact support
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </SurfacePanel>
        )}
      </main>
    </div>
  );
}
