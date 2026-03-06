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

function resolveAuthState(authResponse) {
  if (!authResponse?.ok) {
    return { isSignedIn: false, user: null };
  }

  const payload = authResponse.data || {};
  const user = payload.user || null;
  const isSignedIn =
    typeof payload.isSignedIn === "boolean" ? payload.isSignedIn : Boolean(user);

  return {
    isSignedIn,
    user: isSignedIn ? user : null,
  };
}

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    parallelRequests2(
      () => apiGet("/api/auth/me", { suppressAuthModal: true }),
      () => apiGet("/api/preferences")
    )
      .then(([authResponse, prefResponse]) => {
        const authState = resolveAuthState(authResponse);
        setIsSignedIn(authState.isSignedIn);
        setUser(authState.user);

        if (prefResponse.ok && prefResponse.data?.preferences) {
          applyPreferencesToStorage(prefResponse.data.preferences);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const refresh = useCallback(async () => {
    const response = await apiGet("/api/auth/me", { suppressAuthModal: true });
    const authState = resolveAuthState(response);
    setIsSignedIn(authState.isSignedIn);
    setUser(authState.user);
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
