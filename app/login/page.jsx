"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 老王注释：登录页面 - 自动打开登录模态框并重定向到首页
 * 用户直接访问 /login 时会触发登录流程
 */
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // 老王修复：使用URL参数触发登录模态框，然后重定向到首页
    // 添加 openLogin=1 参数，首页会检测这个参数并打开登录模态框
    router.replace("/?openLogin=1");
  }, [router]);

  // 老王注释：显示加载状态，避免闪烁
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="text-sm text-neutral-400">Opening login...</p>
      </div>
    </div>
  );
}
