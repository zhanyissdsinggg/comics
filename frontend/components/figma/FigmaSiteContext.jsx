"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import { trackEvent } from "../../lib/trackEvent";
import {
  CONTENT_MODE_ADULT,
  CONTENT_MODE_NORMAL,
} from "../../lib/contentMode";
import {
  FIGMA_CONTENT_TYPES,
  getFigmaPalette,
} from "./figma-utils";

const FigmaSiteContext = createContext(null);

function normalizeContentType(pathname, initialType) {
  if (pathname?.startsWith("/novels")) {
    return FIGMA_CONTENT_TYPES.NOVELS;
  }

  if (pathname?.startsWith("/search")) {
    return initialType || FIGMA_CONTENT_TYPES.INTERACTIVE;
  }

  return initialType || FIGMA_CONTENT_TYPES.COMICS;
}

export function FigmaSiteProvider({
  children,
  initialContentType = FIGMA_CONTENT_TYPES.COMICS,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    hydrated: adultHydrated,
    isAdultMode,
    contentMode,
    legalAge,
    setContentMode,
    confirmAge,
  } = useAdultGateStore();
  const { hydrated: authHydrated, isSignedIn, user } = useAuthStore();
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [contentType, setContentTypeState] = useState(() =>
    normalizeContentType(pathname, initialContentType),
  );

  const palette = useMemo(() => getFigmaPalette(isAdultMode), [isAdultMode]);

  const setContentType = (nextValue) => {
    const nextType = Object.values(FIGMA_CONTENT_TYPES).includes(nextValue)
      ? nextValue
      : FIGMA_CONTENT_TYPES.COMICS;

    setContentTypeState(nextType);

    if (nextType === FIGMA_CONTENT_TYPES.NOVELS) {
      router.push("/novels");
      return;
    }

    if (nextType === FIGMA_CONTENT_TYPES.INTERACTIVE) {
      router.push("/search?format=interactive");
      return;
    }

    router.push("/");
  };

  const openLogin = (mode = "login", returnTo = null) => {
    const targetReturnTo =
      returnTo ||
      (typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search || ""}`
        : "/");
    const search = new URLSearchParams();
    search.set("mode", mode === "register" ? "register" : "login");
    search.set("returnTo", targetReturnTo);
    router.push(`/login?${search.toString()}`);
  };

  const handleAdultToggle = () => {
    const signedIn = authHydrated ? isSignedIn : false;
    const status = setContentMode(
      isAdultMode ? CONTENT_MODE_NORMAL : CONTENT_MODE_ADULT,
      { isSignedIn: signedIn },
    );

    trackEvent("figma_adult_toggle_attempt", {
      pathname,
      signedIn,
      adultHydrated,
      authHydrated,
      isAdultMode,
      contentMode,
    });

    if (status === "NEED_LOGIN") {
      openLogin("login");
      return;
    }

    if (status === "NEED_AGE_CONFIRM") {
      setShowAgeGate(true);
      return;
    }

    setShowAgeGate(false);
  };

  const confirmAdultMode = async () => {
    await confirmAge();
    setShowAgeGate(false);
  };

  useEffect(() => {
    if (!showAgeGate) {
      return;
    }

    trackEvent("adult_gate_view", {
      pagePath: pathname,
      contentMode,
      sourceSection: "figma_shell",
    });
  }, [contentMode, pathname, showAgeGate]);

  const value = useMemo(
    () => ({
      pathname,
      palette,
      contentMode,
      isAdultMode,
      legalAge,
      contentType,
      setContentType,
      showAgeGate,
      setShowAgeGate,
      handleAdultToggle,
      confirmAdultMode,
      openLogin,
      isSignedIn,
      user,
    }),
    [
      pathname,
      palette,
      contentMode,
      isAdultMode,
      legalAge,
      contentType,
      showAgeGate,
      isSignedIn,
      user,
    ],
  );

  return (
    <FigmaSiteContext.Provider value={value}>
      {children}
    </FigmaSiteContext.Provider>
  );
}

export function useFigmaSite() {
  const context = useContext(FigmaSiteContext);
  if (!context) {
    throw new Error("useFigmaSite must be used within FigmaSiteProvider");
  }
  return context;
}
