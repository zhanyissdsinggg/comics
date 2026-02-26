"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiGet, apiPost } from "../lib/apiClient";
import { parallelRequests2 } from "../lib/parallelRequests";
import { setCookie } from "../lib/cookies";
import { applyPreferencesToStorage } from "../lib/preferencesClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    // 老王说：并行加载auth和preferences，别tm一个一个地等
    parallelRequests2(
      () => apiGet("/api/auth/me", { suppressAuthModal: true }),
      () => apiGet("/api/preferences")
    )
      .then(([authResponse, prefResponse]) => {
        if (authResponse.ok) {
          setIsSignedIn(true);
          setUser(authResponse.data?.user || null);
        } else {
          setIsSignedIn(false);
          setUser(null);
        }

        // 处理preferences响应
        if (prefResponse.ok && prefResponse.data?.preferences) {
          applyPreferencesToStorage(prefResponse.data.preferences);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const refresh = useCallback(async () => {
    const response = await apiGet("/api/auth/me", { suppressAuthModal: true });
    if (response.ok) {
      setIsSignedIn(true);
      setUser(response.data?.user || null);
    } else {
      setIsSignedIn(false);
      setUser(null);
    }
    return response;
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await apiPost("/api/auth/login", { email, password });
    if (response.ok) {
      setIsSignedIn(true);
      setUser(response.data?.user || null);
      setCookie("mn_is_signed_in", "1");
    }
    return response;
  }, []);

  const register = useCallback(async (email, password) => {
    const response = await apiPost("/api/auth/register", { email, password });
    if (response.ok) {
      setIsSignedIn(true);
      setUser(response.data?.user || null);
      setCookie("mn_is_signed_in", "1");
    }
    return response;
  }, []);

  const signOut = useCallback(async () => {
    await apiPost("/api/auth/logout");
    setIsSignedIn(false);
    setUser(null);
    setCookie("mn_is_signed_in", "0");
  }, []);

  const signIn = useCallback(
    async (email, password, mode = "login") => {
      if (mode === "register") {
        return register(email, password);
      }
      return login(email, password);
    },
    [login, register]
  );

  const value = useMemo(
    () => ({ isSignedIn, user, signIn, signOut, login, register, refresh }),
    [isSignedIn, user, signIn, signOut, login, register, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthStore() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthStore must be used within AuthProvider");
  }
  return context;
}
