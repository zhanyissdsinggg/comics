"use client";

import { Suspense, useEffect, useState } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import Skeleton from "../../../components/common/Skeleton";
import { apiGet } from "../../../lib/apiClient";

function SupportList() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    apiGet("/api/admin/users/support").then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok) {
        setTickets(response.data?.tickets || []);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-300">
          Loading tickets...
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-300">
          No tickets yet.
        </div>
      ) : (
        tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{ticket.subject}</p>
              <p className="text-xs text-neutral-400">{ticket.status}</p>
            </div>
            <p className="mt-2 text-xs text-neutral-400">{ticket.message}</p>
            <p className="mt-2 text-[11px] text-neutral-500">{ticket.userId}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AdminLayout title="支持工单" subtitle="用户提交的工单与处理状态。">
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950">
            <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
              <Skeleton className="h-10 w-56 rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-3xl" />
              <Skeleton className="h-64 w-full rounded-3xl" />
            </div>
          </div>
        }
      >
        <SupportList />
      </Suspense>
    </AdminLayout>
  );
}
