"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAdminAuth } from "./AuthContext";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password, totpCode);

    if (result.success) {
      const next = searchParams?.get("next") || "/admin";
      if (next.startsWith("/admin")) {
        router.push(next);
      } else {
        router.push("/admin");
      }
    } else {
      setError(result.error || "登录失败，请检查后台邮箱或密码。");
    }

    setIsLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--gush-page-bg)] px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_16%_0%,rgba(15,23,42,0.06),transparent_24%),radial-gradient(circle_at_84%_4%,rgba(15,23,42,0.045),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.52),transparent_100%)]" />

      <div className="relative w-full max-w-md rounded-[32px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(247,247,249,0.94))] p-8 shadow-[0_28px_64px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.03]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <ShieldCheck className="size-8" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            后台
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            登录内容管理后台
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            使用后台邮箱和密码进入运营面板。成员身份、角色和两步验证设置会从后台成员目录里读取。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            name="username"
            autoComplete="username"
            value="admin"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">后台邮箱</span>
            <input
              id="adminEmail"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              className="h-12 w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/76 px-4 text-sm text-slate-950 outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[color:var(--gush-border-strong)] focus:bg-white focus:ring-[3px] focus:ring-slate-200/70"
              placeholder="输入邮箱地址（例如 admin@example.com）"
              required
              disabled={isLoading}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">后台密码</span>
            <input
              id="adminPassword"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="h-12 w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/76 px-4 text-sm text-slate-950 outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[color:var(--gush-border-strong)] focus:bg-white focus:ring-[3px] focus:ring-slate-200/70"
              placeholder="输入密码"
              required
              disabled={isLoading}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              6 位验证码
            </span>
            <input
              id="totpCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={totpCode}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                setTotpCode(next);
              }}
              autoComplete="one-time-code"
              className="h-12 w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/76 px-4 text-sm text-slate-950 outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[color:var(--gush-border-strong)] focus:bg-white focus:ring-[3px] focus:ring-slate-200/70"
              placeholder="如已启用两步验证，请输入最新的 6 位验证码"
              disabled={isLoading}
            />
          </label>

          {error ? (
            <div className="rounded-[20px] border border-red-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(254,242,242,0.95))] px-4 py-3 text-sm text-red-700 shadow-[0_8px_18px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="h-12 w-full" disabled={isLoading}>
            {isLoading ? "登录中..." : "登录"}
          </Button>
        </form>

        <div className="mt-6 rounded-[22px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,245,247,0.92))] px-4 py-4 text-sm leading-6 text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
          后台会话会通过安全 Cookie
          保存。如当前成员启用了两步验证，请继续输入最新的 6 位验证码。
        </div>
      </div>
    </div>
  );
}
