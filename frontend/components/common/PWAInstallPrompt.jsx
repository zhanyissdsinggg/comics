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
      <div className="pointer-events-auto mx-auto max-w-4xl overflow-hidden rounded-[28px] border-[3px] border-black bg-white shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),transparent_32%)]" />
          <div className="flex items-start gap-3">
            <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] border-[3px] border-black bg-[#dffcff] text-black shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
              {isIOS ? <Smartphone size={20} /> : <Download size={20} />}
            </div>
            <div className="relative">
              <h3 className="font-display text-sm font-black uppercase tracking-[0.08em] text-black sm:text-base">
                Install Gush
              </h3>
              {isIOS ? (
                <p className="mt-1 text-xs leading-6 text-black/68 sm:text-sm">
                  On iPhone, open{" "}
                  <span className="font-semibold text-black">Share</span>,
                  then choose{" "}
                  <span className="font-semibold text-black">
                    Add to Home Screen
                  </span>
                  .
                </p>
              ) : (
                <p className="mt-1 text-xs leading-6 text-black/68 sm:text-sm">
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
                className="min-h-[44px] rounded-full border-[3px] border-black bg-black px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[6px_6px_0_0_rgba(0,229,255,1)] transition hover:-translate-y-0.5 hover:bg-[#00b7d1]"
              >
                Install
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-[44px] rounded-full border-[3px] border-black bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-black transition hover:-translate-y-0.5 hover:bg-[#fff6cf]"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-[3px] border-black bg-white text-black/55 transition hover:-translate-y-0.5 hover:bg-[#ffe7ec] hover:text-black"
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
