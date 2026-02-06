"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "../../components/admin/AuthContext";
import Skeleton from "../../components/common/Skeleton";

/**
 * 老王说：管理员首页 - 检查登录状态并重定向
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

  // 已认证，重定向到系列管理页面（或其他默认页面）
  router.push("/admin/series");

  return null;
}
