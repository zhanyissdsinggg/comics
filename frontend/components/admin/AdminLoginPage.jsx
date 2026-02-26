"use client";

import { useState } from "react";
import { useAdminAuth } from "./AuthContext";
import { useRouter } from "next/navigation";

/**
 * 老王说：管理员登录页面
 * 这个SB页面用于管理员输入密钥获取JWT token
 */
export default function AdminLoginPage() {
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdminAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(adminKey);

    if (result.success) {
      router.push("/admin");
    } else {
      setError(result.error || "登录失败");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-100">
        {/* 老王说：Logo和标题 */}
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
            管理员登录
          </h1>
          <p className="text-gray-600 mt-2">请输入管理员密钥以继续</p>
        </div>

        {/* 老王说：登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 mb-2">
              管理员密钥
            </label>
            <input
              id="adminKey"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
              placeholder="请输入管理员密钥"
              required
              disabled={isLoading}
            />
          </div>

          {/* 老王说：错误提示 */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 老王说：登录按钮 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-cyan-600 focus:ring-4 focus:ring-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "登录中..." : "登录"}
          </button>
        </form>

        {/* 老王说：提示信息 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>使用JWT认证，安全可靠</p>
        </div>
      </div>
    </div>
  );
}
