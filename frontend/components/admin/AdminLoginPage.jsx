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
      setError(result.error || "登录失败");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-100">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl mb-4">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
            后台登录
          </h1>
          <p className="text-gray-600 mt-2">请输入后台密钥，若启用二次验证请同步填写验证码。</p>
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
            <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 mb-2">
              后台密钥
            </label>
            <input
              id="adminKey"
              name="password"
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
              placeholder="请输入后台密钥"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="totpCode" className="block text-sm font-medium text-gray-700 mb-2">
              二次验证码（可选）
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
              placeholder="6位验证码"
              disabled={isLoading}
            />
          </div>

          {error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-cyan-600 focus:ring-4 focus:ring-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>采用 JWT 会话，可选启用 TOTP 二次验证。</p>
        </div>
      </div>
    </div>
  );
}


