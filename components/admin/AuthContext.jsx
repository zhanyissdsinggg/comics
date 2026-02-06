"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 老王说：管理员认证上下文，管理JWT token和登录状态
 * 这个SB上下文是整个管理员认证系统的核心
 */
const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 老王说：从localStorage加载token
  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");
    const savedRefreshToken = localStorage.getItem("admin_refresh_token");

    if (savedToken && savedRefreshToken) {
      setToken(savedToken);
      setRefreshToken(savedRefreshToken);
      setIsAuthenticated(true);
    }

    setIsLoading(false);
  }, []);

  // 老王说：自动刷新token（在token过期前5分钟刷新）
  useEffect(() => {
    if (!token || !refreshToken) return;

    // 每50分钟刷新一次（token有效期1小时）
    const refreshInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/backend/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
          const data = await response.json();
          setToken(data.accessToken);
          localStorage.setItem("admin_token", data.accessToken);
        } else {
          // 刷新失败，清除token并跳转到登录页
          logout();
        }
      } catch (error) {
        console.error("刷新token失败:", error);
      }
    }, 50 * 60 * 1000); // 50分钟

    return () => clearInterval(refreshInterval);
  }, [token, refreshToken]);

  /**
   * 老王说：登录函数
   * @param {string} adminKey 管理员密钥
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const login = async (adminKey) => {
    try {
      const response = await fetch("/api/backend/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });

      if (!response.ok) {
        return { success: false, error: "管理员密钥错误" };
      }

      const data = await response.json();

      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setIsAuthenticated(true);

      // 保存到localStorage
      localStorage.setItem("admin_token", data.accessToken);
      localStorage.setItem("admin_refresh_token", data.refreshToken);

      return { success: true };
    } catch (error) {
      console.error("登录失败:", error);
      return { success: false, error: "登录失败，请重试" };
    }
  };

  /**
   * 老王说：登出函数
   */
  const logout = () => {
    setToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);

    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_refresh_token");

    router.push("/admin/login");
  };

  /**
   * 老王说：获取带认证头的fetch配置
   * @returns {object} fetch配置对象
   */
  const getAuthHeaders = () => {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const value = {
    token,
    refreshToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    getAuthHeaders,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

/**
 * 老王说：使用管理员认证上下文的Hook
 */
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth必须在AdminAuthProvider内部使用");
  }
  return context;
}
