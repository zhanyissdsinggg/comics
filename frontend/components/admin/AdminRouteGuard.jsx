"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "./AuthContext";

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
  const { isAuthenticated, isLoading } = useAdminAuth();

  const isLoginPage = pathname === "/admin/login";
  const nextParam = searchParams?.get("next") || "";

  const nextPath = useMemo(() => {
    if (isSafeAdminPath(nextParam)) {
      return nextParam;
    }
    return "/admin";
  }, [nextParam]);

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
    }
  }, [isAuthenticated, isLoading, isLoginPage, nextPath, pathname, router, searchParams]);

  if (isLoginPage) {
    return children;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--gush-page-bg)]">
        <div className="rounded-[24px] border border-black/8 bg-white/88 px-6 py-4 text-sm text-slate-600 shadow-[var(--gush-shadow-soft)]">
          正在检查后台登录状态...
        </div>
      </div>
    );
  }

  return children;
}
