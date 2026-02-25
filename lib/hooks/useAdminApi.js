"use client";

import { useState, useCallback } from "react";

/**
 * 老王注释：统一API调用Hook - 所有admin页面都用这个
 * 这个SB Hook处理认证、错误处理、加载状态，让前端代码简洁多了
 */
export function useAdminApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(
    async (
      url,
      options = {}
    ) => {
      setLoading(true);
      setError(null);

      try {
        // 老王说：从localStorage获取token
        const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

        const headers = {
          "Content-Type": "application/json",
          ...options.headers,
        };

        // 老王说：如果有token就加到Authorization头
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          ...options,
          headers,
        });

        // 老王说：处理401未授权，跳转到登录页
        if (response.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("admin_token");
            window.location.href = "/admin/login";
          }
          throw new Error("认证失败，请重新登录");
        }

        // 老王说：处理其他HTTP错误
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "未知错误";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { request, loading, error, setError };
}
