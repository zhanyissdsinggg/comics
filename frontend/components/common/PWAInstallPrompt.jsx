"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Smartphone, X } from "lucide-react";

const PWAInstallPrompt = React.memo(() => {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const isAdminRoute = pathname?.startsWith("/admin");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      setIsMobileViewport(false);
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = (event) => {
      setIsMobileViewport(event.matches);
    };

    syncViewport(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (isAdminRoute) {
      setShowPrompt(false);
      return;
    }

    if (isMobileViewport) {
      setShowPrompt(false);
      return;
    }

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
      setShowPrompt(false);
      return;
    }

    const dismissed =
      localStorage.getItem("mn_pwa_prompt_dismissed") === "true";
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    setIsIOS(isIOSDevice);

    if (isIOSDevice && !dismissed) {
      setShowPrompt(true);
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);

      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isAdminRoute, isMobileViewport]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setShowPrompt(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem("mn_pwa_prompt_dismissed", "true");
  }, []);

  if (isAdminRoute || isInstalled || isMobileViewport || !showPrompt) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="pointer-events-auto mx-auto max-w-4xl overflow-hidden rounded-[30px] border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-black bg-[#00E5FF] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {isIOS ? <Smartphone size={20} /> : <Download size={20} />}
            </div>
            <div className="relative">
              <h3 className="font-display text-sm font-semibold tracking-[0.01em] text-white sm:text-base">
                Install Gush
              </h3>
              {isIOS ? (
                <p className="mt-1 text-xs leading-6 text-white/70 sm:text-sm">
                  On iPhone, open{" "}
                  <span className="font-semibold text-white">Share</span>,
                  then choose{" "}
                  <span className="font-semibold text-white">
                    Add to Home Screen
                  </span>
                  .
                </p>
              ) : (
                <p className="mt-1 text-xs leading-6 text-white/70 sm:text-sm">
                  Add Gush for faster launch and cleaner reading.
                </p>
              )}
            </div>
          </div>

          <div className="relative flex flex-wrap items-center gap-2">
            {!isIOS ? (
              <button
                type="button"
                onClick={handleInstall}
                className="min-h-[44px] rounded-full border-2 border-black bg-[#00E5FF] px-4 py-2 text-sm font-semibold tracking-[0.02em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5"
              >
                Install
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-[44px] rounded-full border-2 border-white/20 bg-black px-4 py-2 text-sm font-semibold tracking-[0.02em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/30"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-white/20 bg-black text-white/70 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/30 hover:text-white"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

PWAInstallPrompt.displayName = "PWAInstallPrompt";

export default PWAInstallPrompt;
