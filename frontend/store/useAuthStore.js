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
import { setCookie } from "../lib/cookies";
import {
  applyPreferencesToStorage,
  mergeAdultStateIfNewer,
} from "../lib/preferencesClient";

const AuthContext = createContext(null);
const SIGNED_IN_HINT_COOKIE = "mn_is_signed_in";

function resolveAuthState(authResponse) {
  if (!authResponse?.ok) {
    return { isSignedIn: false, user: null };
  }

  const payload = authResponse.data || {};
  const user = payload.user || null;
  const isSignedIn =
    typeof payload.isSignedIn === "boolean"
      ? payload.isSignedIn
      : Boolean(user);

  return {
    isSignedIn,
    user: isSignedIn ? user : null,
  };
}

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const applyAuthState = useCallback((authState) => {
    setIsSignedIn(authState.isSignedIn);
    setUser(authState.user);
    setCookie(SIGNED_IN_HINT_COOKIE, authState.isSignedIn ? "1" : "0");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    const preferencesRequestStartedAt = Date.now();

    apiGet("/api/auth/me", { suppressAuthModal: true })
      .then((authResponse) => {
        if (!cancelled) {
          applyAuthState(resolveAuthState(authResponse));
        }
      })
      .catch(() => {
        if (!cancelled) {
          applyAuthState({ isSignedIn: false, user: null });
        }
      });

    apiGet("/api/preferences")
      .then((prefResponse) => {
        if (!cancelled && prefResponse.ok && prefResponse.data?.preferences) {
          applyPreferencesToStorage(
            mergeAdultStateIfNewer(
              prefResponse.data.preferences,
              preferencesRequestStartedAt,
            ),
          );
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [applyAuthState]);

  const refresh = useCallback(async () => {
    const response = await apiGet("/api/auth/me", { suppressAuthModal: true });
    applyAuthState(resolveAuthState(response));
    return response;
  }, [applyAuthState]);

  const login = useCallback(
    async (email, password) => {
      const response = await apiPost("/api/auth/login", { email, password });
      if (response.ok) {
        applyAuthState({
          isSignedIn: true,
          user: response.data?.user || null,
        });
      }
      return response;
    },
    [applyAuthState],
  );

  const register = useCallback(
    async (email, password) => {
      const response = await apiPost("/api/auth/register", { email, password });
      if (response.ok) {
        applyAuthState({
          isSignedIn: true,
          user: response.data?.user || null,
        });
      }
      return response;
    },
    [applyAuthState],
  );

  const signOut = useCallback(async () => {
    await apiPost("/api/auth/logout");
    applyAuthState({ isSignedIn: false, user: null });
  }, [applyAuthState]);

  const signIn = useCallback(
    async (email, password, mode = "login") => {
      if (mode === "register") {
        return register(email, password);
      }
      return login(email, password);
    },
    [login, register],
  );

  const value = useMemo(
    () => ({
      hydrated,
      isSignedIn,
      user,
      signIn,
      signOut,
      login,
      register,
      refresh,
    }),
    [hydrated, isSignedIn, user, signIn, signOut, login, register, refresh],
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
