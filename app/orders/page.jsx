"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../components/layout/SiteHeader";
import { apiGet } from "../../lib/apiClient";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
