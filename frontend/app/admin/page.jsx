"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "../../components/admin/AuthContext";
import AdminShell from "../../components/admin/AdminShell";
import AdminDashboardNew from "../../components/admin/AdminDashboardNew";
import Skeleton from "../../components/common/Skeleton";

/**
 * 老王重新设计：管理员首页 - 显示Dashboard数据看板
 */
export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // 未登录，重定向到登录页面
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // 加载中或未认证时显示骨架屏
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
          <Skeleton className="h-10 w-56 rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  // 老王修改：显示Dashboard而不是重定向
  return (
    <AdminShell title="数据看板" subtitle="实时监控平台运营状况">
      <AdminDashboardNew />
    </AdminShell>
  );
}
