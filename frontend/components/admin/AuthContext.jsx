"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../../lib/apiClient";
import { buildAdminSession } from "../../lib/adminAccess";

const AUTH_SNAPSHOT_KEY = "admin_auth_snapshot";
const AUTH_INVALIDATED_EVENT = "admin-auth-invalidated";
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

function getSnapshotStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readAuthSnapshot() {
  const storage = getSnapshotStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(AUTH_SNAPSHOT_KEY);
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
      session: buildAdminSession(parsed.session),
    };
  } catch {
    return null;
  }
}

function writeAuthSnapshot(isAuthenticated, session = null) {
  const storage = getSnapshotStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      AUTH_SNAPSHOT_KEY,
      JSON.stringify({
        isAuthenticated: Boolean(isAuthenticated),
        verifiedAt: Date.now(),
        session: buildAdminSession(session),
      }),
    );
  } catch {
    // Ignore storage write failures.
  }
}

function clearAuthSnapshot() {
  const storage = getSnapshotStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(AUTH_SNAPSHOT_KEY);
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const markSessionInvalid = useCallback(() => {
    clearAuthSnapshot();
    setIsAuthenticated(false);
    setSession(null);
  }, []);

  const verifySession = useCallback(
    async ({ silent = false, fallbackAuthenticated = false } = {}) => {
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
            body: JSON.stringify({}),
          });
          const raw = await response.json().catch(() => ({}));
          const data = unwrapPayload(raw);
          const valid = Boolean(data.valid);
          const nextSession = buildAdminSession(data.session);

          if (valid) {
            writeAuthSnapshot(true, nextSession);
            setIsAuthenticated(true);
            setSession(nextSession);
            return true;
          }

          markSessionInvalid();
          return false;
        } catch {
          if (!silent) {
            setIsAuthenticated(Boolean(fallbackAuthenticated));
          }
          if (!fallbackAuthenticated) {
            setSession(null);
          }
          return Boolean(fallbackAuthenticated);
        } finally {
          inflightVerifyPromise = null;
        }
      })();

      return inflightVerifyPromise;
    },
    [markSessionInvalid],
  );

  const logout = useCallback(async () => {
    const baseUrl = getApiBaseUrl();

    try {
      await fetch(`${baseUrl}/api/admin/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
    } catch (error) {
      console.error("admin logout failed:", error);
    }

    markSessionInvalid();
    setIsLoading(false);
    router.replace("/admin/login");
  }, [markSessionInvalid, router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleAuthInvalidated = () => {
      markSessionInvalid();
      setIsLoading(false);
    };

    window.addEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
    return () => {
      window.removeEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
    };
  }, [markSessionInvalid]);

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      const snapshot = readAuthSnapshot();

      if (hasFreshVerifiedSnapshot(snapshot)) {
        if (!cancelled) {
          setIsAuthenticated(true);
          setSession(snapshot?.session || null);
          setIsLoading(false);
        }

        void verifySession({ silent: true, fallbackAuthenticated: true });
        return;
      }

      const valid = await verifySession();
      if (!cancelled) {
        setIsAuthenticated(valid);
        setIsLoading(false);
      }
    }

    void initAuth();
    return () => {
      cancelled = true;
    };
  }, [verifySession]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const timer = setInterval(async () => {
      const baseUrl = getApiBaseUrl();

      try {
        const response = await fetch(`${baseUrl}/api/admin/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          if (response.status === 401) {
            void logout();
          }
          return;
        }

        const raw = await response.json().catch(() => ({}));
        const data = unwrapPayload(raw);
        if (data.success === false) {
          return;
        }

        const nextSession = buildAdminSession(data.session) || session;
        writeAuthSnapshot(true, nextSession);
        setSession(nextSession);
      } catch (error) {
        console.error("admin session refresh failed:", error);
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isAuthenticated, logout, session]);

  const login = useCallback(
    async (email, password, totpCode = "") => {
      try {
        const baseUrl = getApiBaseUrl();
        const normalizedEmail = String(email || "").trim();
        const normalizedPassword = String(password || "");
        const normalizedTotp = String(totpCode || "").trim();
        const payload = {
          email: normalizedEmail,
          password: normalizedPassword,
        };

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
          return { success: false, error: data?.message || "账号或密码无效。" };
        }

        const nextSession = buildAdminSession(data.session);
        if (nextSession) {
          writeAuthSnapshot(true, nextSession);
          setIsAuthenticated(true);
          setSession(nextSession);
        }

        const valid = await verifySession();
        if (!valid) {
          return {
            success: false,
            error:
              "登录成功，但后台会话 Cookie 没有建立。请检查 Cookie 或代理配置。",
          };
        }

        setIsLoading(false);
        return { success: true };
      } catch (error) {
        console.error("admin login failed:", error);
        return { success: false, error: "登录失败，请稍后再试。" };
      }
    },
    [verifySession],
  );

  const value = {
    isAuthenticated,
    isLoading,
    session,
    adminRole: session?.adminRole || null,
    permissions: session?.permissions || [],
    routePatterns: session?.routePatterns || [],
    homePath: session?.homePath || "/admin",
    login,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
