"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { setCookie } from "../lib/cookies";

const AuthContext = createContext(null);
const STORAGE_KEY = "mn_signed_in";

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setIsSignedIn(window.localStorage.getItem(STORAGE_KEY) === "1");
    setHydrated(true);
  }, []);

  const signIn = useCallback(() => {
    setIsSignedIn(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  }, []);

  const signOut = useCallback(() => {
    setIsSignedIn(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "0");
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    setCookie("mn_is_signed_in", isSignedIn ? "1" : "0");
  }, [hydrated, isSignedIn]);

  const value = useMemo(
    () => ({ isSignedIn, signIn, signOut }),
    [isSignedIn, signIn, signOut]
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
