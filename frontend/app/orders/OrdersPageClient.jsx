"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useAuthStore } from "../../store/useAuthStore";

export default function OrdersPageClient() {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");

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

  const orderStats = useMemo(() => {
    const paidCount = orders.filter((order) => order.status === "PAID").length;
    const refundedCount = orders.filter((order) => String(order.status).includes("REFUND")).length;
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0);

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
        label: "Amount",
        value: loading ? "..." : totalAmount.toFixed(2),
        hint: "Raw total of visible order amounts before currency conversion.",
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
          eyebrow="Receipt desk"
          title="Track receipts, reconciliation, and refund state from one ledger view."
          description="Orders now live in the same editorial surface as the rest of the product, with better scanning for status, amount, and action state."
          secondary="Reconciliation and refund requests still use the existing backend endpoints and account gating."
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
                  setWorkingId("reconcile");
                  const response = await apiPost("/api/orders/reconcile");
                  if (response.ok) {
                    setOrders(response.data?.orders || []);
                    setMessage(`Reconciled ${response.data?.updated || 0} orders.`);
                  } else {
                    setMessage(response.error || "Reconcile failed.");
                  }
                  setWorkingId("");
                }}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hydrated || !isSignedIn || workingId === "reconcile"}
              >
                {workingId === "reconcile" ? "Reconciling..." : "Reconcile Orders"}
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

        {message ? (
          <SurfacePanel className="border border-white/10 bg-emerald-500/10">
            <p className="text-sm text-neutral-100">{message}</p>
          </SurfacePanel>
        ) : null}

        {!hydrated || loading ? (
          <SurfacePanel>
            <p className="text-sm text-neutral-400">Loading orders...</p>
          </SurfacePanel>
        ) : !isSignedIn ? (
          <SurfacePanel className="space-y-4">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
              Sign in to load your ledger
            </h2>
            <p className="text-sm leading-6 text-neutral-300">
              Receipts, reconciliation, and refund actions require an authenticated account session.
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
            <p className="text-sm text-neutral-400">No orders yet.</p>
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
                        {order.amount} {order.currency} - {order.orderId}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-300">
                      {order.status}
                    </span>
                  </div>
                  {order.status === "PAID" ? (
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
                          setMessage("Refund requested.");
                        } else {
                          setMessage(response.error || "Refund failed.");
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
                      {workingId === order.orderId ? "Requesting..." : "Refund"}
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
