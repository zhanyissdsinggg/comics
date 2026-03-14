"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "../../components/admin/AuthContext";
import AdminShell from "../../components/admin/AdminShell";
import AdminDashboardNew from "../../components/admin/AdminDashboardNew";
import Skeleton from "../../components/common/Skeleton";

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
      <div className="min-h-screen bg-neutral-950">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
          <Skeleton className="h-10 w-56 rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      title="仪表盘"
      subtitle="实时查看运营状态、收入表现与平台健康度。"
    >
      <AdminDashboardNew />
    </AdminShell>
  );
}
