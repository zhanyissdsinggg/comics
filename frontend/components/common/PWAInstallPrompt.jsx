"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Smartphone, X } from "lucide-react";
import { isFigmaRoute } from "../../lib/figmaRoutes";
import {
  storefrontBadgeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "./StorefrontPagePrimitives";

const PWAInstallPrompt = React.memo(() => {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const isAdminRoute = pathname?.startsWith("/admin");
  const useFigmaChrome = isFigmaRoute(pathname);

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
    if (isAdminRoute || useFigmaChrome) {
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
  }, [isAdminRoute, isMobileViewport, useFigmaChrome]);

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

  if (
    isAdminRoute ||
    useFigmaChrome ||
    isInstalled ||
    isMobileViewport ||
    !showPrompt
  ) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="pointer-events-auto mx-auto max-w-4xl overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(16,13,24,0.98)_100%)] shadow-[0_24px_60px_rgba(8,6,20,0.34)] backdrop-blur-xl">
        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(103,232,249,0.1),transparent_20%)]" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[rgba(103,232,249,0.18)] bg-[rgba(103,232,249,0.12)] text-[var(--gush-cyan)] shadow-[0_14px_30px_rgba(8,6,20,0.2)]">
              {isIOS ? <Smartphone size={20} /> : <Download size={20} />}
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold tracking-[-0.02em] text-white sm:text-base">
                Install Gush
              </h3>
              {isIOS ? (
                <p className="mt-1 text-xs leading-6 text-white/66 sm:text-sm">
                  On iPhone, open{" "}
                  <span className="font-semibold text-white">Share</span>, then
                  choose{" "}
                  <span className="font-semibold text-white">
                    Add to Home Screen
                  </span>
                  .
                </p>
              ) : (
                <p className="mt-1 text-xs leading-6 text-white/66 sm:text-sm">
                  Add Gush for faster launch and a cleaner reading flow.
                </p>
              )}
            </div>
          </div>

          <div className="relative flex flex-wrap items-center gap-2">
            {!isIOS ? (
              <button
                type="button"
                onClick={handleInstall}
                className={`min-h-[44px] px-4 py-2 text-sm text-[#1a0e16] ${storefrontPrimaryButtonClass}`}
              >
                Install
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismiss}
              className={`min-h-[44px] px-4 py-2 text-sm ${storefrontSecondaryButtonClass}`}
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center text-white/66 hover:text-white ${storefrontSecondaryButtonClass}`}
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
