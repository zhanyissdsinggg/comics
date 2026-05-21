"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock, ShieldAlert } from "lucide-react";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import { trackEvent } from "../../lib/trackEvent";
import { CONTENT_MODE_ADULT, CONTENT_MODE_NORMAL } from "../../lib/contentMode";
import { cn, FIGMA_CONTENT_TYPES, getFigmaPalette } from "./figma-utils";

const FigmaSiteContext = createContext(null);

function FigmaAgeGateModal() {
  const { palette, showAgeGate, setShowAgeGate, legalAge, confirmAdultMode } =
    useFigmaSite();

  if (!showAgeGate) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-900/40 bg-[#121212] p-8 shadow-2xl">
        <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-red-600 to-rose-900" />
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mb-3 text-2xl font-black tracking-tight text-white md:text-3xl">
            Age Verification Required
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-gray-400 md:text-base">
            Mature stories are limited to readers {legalAge}+. Confirm your age
            to switch into the adult-only catalog.
          </p>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowAgeGate(false)}
              className="flex-1 rounded-xl border border-transparent bg-gray-800 px-4 py-3.5 font-bold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-700 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAdultMode}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-black text-white transition-all active:scale-95",
                palette.primaryBg,
              )}
            >
              <Lock className="h-5 w-5" />I am {legalAge} or older
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      router.push("/interactive");
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
      <FigmaAgeGateModal />
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
