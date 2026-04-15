"use client";

export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import AdminShell from "../../components/admin/AdminShell";
import { useAdminAuth } from "../../components/admin/AuthContext";
import Skeleton from "../../components/common/Skeleton";

const AdminDashboardClean = dynamicImport(
  () => import("../../components/admin/AdminDashboardClean"),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-[32px]" />
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`admin-dashboard-card-${index}`} className="h-32 rounded-[28px]" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-[28px]" />
        <Skeleton className="h-[28rem] rounded-[28px]" />
      </div>
    ),
  },
);

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--gush-page-bg)]">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
          <Skeleton className="h-10 w-56 rounded-[20px]" />
          <Skeleton className="h-32 w-full rounded-[28px]" />
          <Skeleton className="h-64 w-full rounded-[28px]" />
        </div>
      </div>
    );
  }

  return (
    <AdminShell title="仪表盘" subtitle="先看今天最该处理的事。">
      <AdminDashboardClean />
    </AdminShell>
  );
}
