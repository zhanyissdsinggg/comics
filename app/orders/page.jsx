"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../components/layout/SiteHeader";
import { apiGet, apiPost } from "../../lib/apiClient";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    apiGet("/api/orders").then((response) => {
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
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-8">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Recent purchases for reconciliation.
        </p>
        {message ? (
          <div className="mt-4 rounded-2xl border border-neutral-900 bg-neutral-900/50 p-3 text-xs text-neutral-300">
            {message}
          </div>
        ) : null}
        <div className="mt-4">
          <button
            type="button"
            onClick={async () => {
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
            className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
            disabled={workingId === "reconcile"}
          >
            Reconcile
          </button>
        </div>
        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-400">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-400">
              No orders yet.
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.orderId}
                className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{order.packageId}</p>
                  <p className="text-xs text-neutral-400">{order.status}</p>
                </div>
                <div className="mt-2 text-xs text-neutral-400">
                  {order.amount} {order.currency} · {order.orderId}
                </div>
                {order.status === "PAID" ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setWorkingId(order.orderId);
                      const response = await apiPost("/api/payments/refund", {
                        orderId: order.orderId,
                      });
                      if (response.ok) {
                        setOrders((prev) =>
                          prev.map((item) =>
                            item.orderId === order.orderId ? response.data?.order : item
                          )
                        );
                        setMessage("Refund requested.");
                      } else {
                        setMessage(response.error || "Refund failed.");
                      }
                      setWorkingId("");
                    }}
                    className="mt-3 rounded-full border border-neutral-800 px-3 py-1 text-xs"
                    disabled={workingId === order.orderId}
                  >
                    Refund
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
