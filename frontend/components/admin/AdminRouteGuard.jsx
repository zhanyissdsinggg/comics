"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import { canAccessAdminRoute } from "../../lib/adminAccess";

function isSafeAdminPath(value) {
  return typeof value === "string" && value.startsWith("/admin");
}

function buildNextPath(pathname, searchParams) {
  const query = searchParams?.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function AdminRouteGuard({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, routePatterns, homePath } =
    useAdminAuth();

  const isLoginPage = pathname === "/admin/login";
  const nextParam = searchParams?.get("next") || "";

  const nextPath = useMemo(() => {
    if (
      isSafeAdminPath(nextParam) &&
      canAccessAdminRoute(nextParam, routePatterns)
    ) {
      return nextParam;
    }
    return homePath || "/admin";
  }, [homePath, nextParam, routePatterns]);

  const hasRouteAccess = useMemo(() => {
    if (isLoginPage) {
      return true;
    }
    return canAccessAdminRoute(pathname, routePatterns);
  }, [isLoginPage, pathname, routePatterns]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isLoginPage) {
      if (isAuthenticated) {
        router.replace(nextPath);
      }
      return;
    }

    if (!isAuthenticated) {
      const target = buildNextPath(pathname, searchParams);
      router.replace(`/admin/login?next=${encodeURIComponent(target)}`);
      return;
    }

    if (!hasRouteAccess) {
      router.replace(homePath || "/admin");
    }
  }, [
    hasRouteAccess,
    homePath,
    isAuthenticated,
    isLoading,
    isLoginPage,
    nextPath,
    pathname,
    router,
    searchParams,
  ]);

  if (isLoginPage) {
    return children;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--gush-page-bg)] px-4">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-6 py-4 text-sm text-slate-600 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
          正在检查后台登录状态...
        </div>
      </div>
    );
  }

  if (!hasRouteAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--gush-page-bg)] px-4">
        <div className="w-full max-w-xl rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] p-8 text-center shadow-[0_16px_36px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.02]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            后台权限
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            当前账号不能访问这个页面
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            当前角色的工作区已经按权限收口。若要进入这个页面，请先在后台角色分配里补齐权限。
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href={homePath || "/admin"}
              className="inline-flex h-11 items-center rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-5 text-sm font-medium text-slate-950"
            >
              返回可访问的工作区
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
