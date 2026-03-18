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
  const isAdminRoute = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isAdminRoute) {
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

    const dismissed = localStorage.getItem("mn_pwa_prompt_dismissed") === "true";
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
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isAdminRoute]);

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

  if (isAdminRoute || isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-[28px] border border-black/8 bg-[rgba(255,255,255,0.94)] shadow-[0_22px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.08),transparent_28%),radial-gradient(circle_at_82%_0%,rgba(255,255,255,0.76),transparent_24%)]" />
        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] bg-[rgba(47,107,255,0.1)] text-[var(--gush-accent,#2f6bff)]">
              {isIOS ? <Smartphone size={20} /> : <Download size={20} />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-950 sm:text-base">
                Install Gush
              </h3>
              {isIOS ? (
                <p className="mt-1 text-xs leading-6 text-slate-600 sm:text-sm">
                  On iPhone, tap <span className="font-semibold text-slate-900">Share</span> and then{" "}
                  <span className="font-semibold text-slate-900">Add to Home Screen</span>.
                </p>
              ) : (
                <p className="mt-1 text-xs leading-6 text-slate-600 sm:text-sm">
                  Add Gush to your home screen for faster launches, cleaner reading, and a more app-like feel.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isIOS ? (
              <button
                type="button"
                onClick={handleInstall}
                className="min-h-[44px] rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Install app
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-[44px] rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-black/8 bg-white/80 text-slate-500 transition hover:bg-white hover:text-slate-900"
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
