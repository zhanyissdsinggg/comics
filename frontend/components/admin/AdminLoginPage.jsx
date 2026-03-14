"use client";

import { useState } from "react";
import { useAdminAuth } from "./AuthContext";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const [adminKey, setAdminKey] = useState("");
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

    const result = await login(adminKey, totpCode);

    if (result.success) {
      const next = searchParams?.get("next") || "/admin";
      if (next.startsWith("/admin")) {
        router.push(next);
      } else {
        router.push("/admin");
      }
    } else {
      setError(result.error || "登录失败。");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-block rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-4">
            <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
            后台登录
          </h1>
          <p className="mt-2 text-gray-600">
            请输入后台密钥。如果启用了双重验证，也请一并输入当前的 TOTP 验证码。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div>
            <label htmlFor="adminKey" className="mb-2 block text-sm font-medium text-gray-700">
              后台密钥
            </label>
            <input
              id="adminKey"
              name="password"
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder="请输入后台密钥"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="totpCode" className="mb-2 block text-sm font-medium text-gray-700">
              TOTP 验证码（可选）
            </label>
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
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder="6 位验证码"
              disabled={isLoading}
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-semibold text-white transition-all hover:from-emerald-600 hover:to-cyan-600 focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>后台会话通过安全的 JWT Cookie 管理，并支持可选的 TOTP 双重验证。</p>
        </div>
      </div>
    </div>
  );
}
