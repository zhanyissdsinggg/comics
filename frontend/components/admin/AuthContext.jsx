"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../../lib/apiClient";

const ACCESS_TOKEN_KEY = "admin_token";
const REFRESH_TOKEN_KEY = "admin_refresh_token";
const AUTH_SNAPSHOT_KEY = "admin_auth_snapshot";
const REFRESH_INTERVAL_MS = 50 * 60 * 1000;
const VERIFY_CACHE_MS = 5 * 60 * 1000;

const AdminAuthContext = createContext(null);
let inflightVerifyPromise = null;

function unwrapPayload(raw) {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw.data && typeof raw.data === "object" ? raw.data : raw;
}

function getStoredToken(key) {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(key);
}

function setStoredToken(key, value) {
  if (typeof window === "undefined") {
    return;
  }
  if (!value) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
}

function readAuthSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(AUTH_SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      verifiedAt: Number(parsed.verifiedAt || 0),
    };
  } catch {
    return null;
  }
}

function writeAuthSnapshot(isAuthenticated) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      AUTH_SNAPSHOT_KEY,
      JSON.stringify({
        isAuthenticated: Boolean(isAuthenticated),
        verifiedAt: Date.now(),
      }),
    );
  } catch {
    // Ignore storage write failures.
  }
}

function clearAuthSnapshot() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(AUTH_SNAPSHOT_KEY);
  } catch {
    // Ignore storage removal failures.
  }
}

function hasFreshVerifiedSnapshot(snapshot) {
  if (!snapshot?.isAuthenticated) {
    return false;
  }

  return Date.now() - Number(snapshot.verifiedAt || 0) < VERIFY_CACHE_MS;
}

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const clearLocalTokens = useCallback(() => {
    setStoredToken(ACCESS_TOKEN_KEY, null);
    setStoredToken(REFRESH_TOKEN_KEY, null);
    clearAuthSnapshot();
  }, []);

  const verifySession = useCallback(async (accessToken, { silent = false } = {}) => {
    if (inflightVerifyPromise) {
      return inflightVerifyPromise;
    }

    const baseUrl = getApiBaseUrl();
    inflightVerifyPromise = (async () => {
      try {
        const response = await fetch(`${baseUrl}/api/admin/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(accessToken ? { token: accessToken } : {}),
        });
        const raw = await response.json().catch(() => ({}));
        const data = unwrapPayload(raw);
        const valid = Boolean(data.valid);

        writeAuthSnapshot(valid);

        setIsAuthenticated(valid);
        if (!valid) {
          setToken(null);
          setRefreshToken(null);
          clearLocalTokens();
        }

        return valid;
      } catch {
        const fallbackValid = Boolean(accessToken);
        if (!silent) {
          setIsAuthenticated(fallbackValid);
        }
        return fallbackValid;
      } finally {
        inflightVerifyPromise = null;
      }
    })();

    return inflightVerifyPromise;
  }, [clearLocalTokens]);

  const logout = useCallback(async () => {
    const baseUrl = getApiBaseUrl();
    const currentToken = getStoredToken(ACCESS_TOKEN_KEY);
    const currentRefreshToken = getStoredToken(REFRESH_TOKEN_KEY);

    try {
      const logoutPayload = {};
      if (currentToken) {
        logoutPayload.token = currentToken;
      }
      if (currentRefreshToken) {
        logoutPayload.refreshToken = currentRefreshToken;
      }

      await fetch(`${baseUrl}/api/admin/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(logoutPayload),
      });
    } catch (error) {
      console.error("admin logout failed:", error);
    }

    setToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
    clearLocalTokens();
    router.push("/admin/login");
  }, [clearLocalTokens, router]);

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      const savedAccessToken = getStoredToken(ACCESS_TOKEN_KEY);
      const savedRefreshToken = getStoredToken(REFRESH_TOKEN_KEY);
      const snapshot = readAuthSnapshot();

      if (savedAccessToken) {
        setToken(savedAccessToken);
      }
      if (savedRefreshToken) {
        setRefreshToken(savedRefreshToken);
      }

      if (!savedAccessToken && !savedRefreshToken) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      }

      if (hasFreshVerifiedSnapshot(snapshot)) {
        if (!cancelled) {
          setIsAuthenticated(true);
          setIsLoading(false);
        }

        void verifySession(savedAccessToken, { silent: true });
        return;
      }

      const valid = await verifySession(savedAccessToken);
      if (!cancelled) {
        setIsAuthenticated(valid);
        setIsLoading(false);
      }
    }

    initAuth();
    return () => {
      cancelled = true;
    };
  }, [clearLocalTokens]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const timer = setInterval(async () => {
      const baseUrl = getApiBaseUrl();
      try {
        const response = await fetch(`${baseUrl}/api/admin/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(refreshToken ? { refreshToken } : {}),
        });

        if (!response.ok) {
          if (response.status === 401) {
            logout();
          }
          return;
        }

        const raw = await response.json().catch(() => ({}));
        const data = unwrapPayload(raw);
        if (!data.success) {
          return;
        }

        if (typeof data.accessToken === "string" && data.accessToken) {
          setToken(data.accessToken);
          setStoredToken(ACCESS_TOKEN_KEY, data.accessToken);
          writeAuthSnapshot(true);
        }
        if (typeof data.refreshToken === "string" && data.refreshToken) {
          setRefreshToken(data.refreshToken);
          setStoredToken(REFRESH_TOKEN_KEY, data.refreshToken);
        }
      } catch (error) {
        console.error("admin token refresh failed:", error);
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isAuthenticated, refreshToken, logout]);

  const login = useCallback(async (adminKey, totpCode = "") => {
    try {
      const baseUrl = getApiBaseUrl();
      const normalizedAdminKey = String(adminKey || "").trim();
      const normalizedTotp = String(totpCode || "").trim();
      const payload = { adminKey: normalizedAdminKey };
      if (normalizedTotp) {
        payload.totpCode = normalizedTotp;
      }

      const response = await fetch(`${baseUrl}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const raw = await response.json().catch(() => ({}));
      const data = unwrapPayload(raw);
      if (!response.ok || data.success === false) {
        return { success: false, error: data?.message || "后台密钥无效" };
      }

      if (typeof data.accessToken === "string" && data.accessToken) {
        setToken(data.accessToken);
        setStoredToken(ACCESS_TOKEN_KEY, data.accessToken);
      } else {
        setToken(null);
        setStoredToken(ACCESS_TOKEN_KEY, null);
      }

      if (typeof data.refreshToken === "string" && data.refreshToken) {
        setRefreshToken(data.refreshToken);
        setStoredToken(REFRESH_TOKEN_KEY, data.refreshToken);
      } else {
        setRefreshToken(null);
        setStoredToken(REFRESH_TOKEN_KEY, null);
      }

      setIsAuthenticated(true);
      setIsLoading(false);
      writeAuthSnapshot(true);
      return { success: true };
    } catch (error) {
      console.error("admin login failed:", error);
      return { success: false, error: "登录失败，请稍后再试。" };
    }
  }, []);

  const getAuthHeaders = useCallback(() => {
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

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

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
