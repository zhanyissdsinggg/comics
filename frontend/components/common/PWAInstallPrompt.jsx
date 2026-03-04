"use client";

import React, { useState, useEffect, useCallback } from "react";

const PWAInstallPrompt = React.memo(() => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);

      const dismissed = localStorage.getItem("mn_pwa_prompt_dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

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

  if (isInstalled || !showPrompt) {
    return null;
  }

  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 mb-0 border-t border-neutral-800 bg-neutral-900 p-3 shadow-2xl md:mb-0 md:p-4">
        <div className="mx-auto flex max-w-4xl items-start gap-3 md:gap-4">
          <div className="flex-shrink-0 text-xl md:text-2xl" aria-hidden="true">
            APP
          </div>
          <div className="flex-1">
            <h3 className="mb-1 text-sm font-semibold text-white md:text-base">
              Install Gush App
            </h3>
            <p className="mb-2 text-xs text-neutral-400 md:text-sm">
              Install on iPhone: tap <span className="font-semibold">Share</span>{" "}
              then choose <span className="font-semibold">Add to Home Screen</span>.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="min-h-[44px] min-w-[44px] flex-shrink-0 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white active:bg-neutral-700"
            aria-label="Close"
          >
            x
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mb-0 border-t border-neutral-800 bg-neutral-900 p-3 shadow-2xl md:mb-0 md:p-4">
      <div className="mx-auto flex max-w-4xl items-start gap-3 md:gap-4">
        <div className="flex-shrink-0 text-xl md:text-2xl" aria-hidden="true">
          APP
        </div>
        <div className="flex-1">
          <h3 className="mb-1 text-sm font-semibold text-white md:text-base">
            Install Gush App
          </h3>
          <p className="mb-2 text-xs text-neutral-400 md:mb-3 md:text-sm">
            Install our app for a better experience. Access your content offline,
            get faster loading, and enjoy a native app feel.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleInstall}
              className="min-h-[44px] rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700"
            >
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="min-h-[44px] rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 active:bg-neutral-700"
            >
              Not Now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="min-h-[44px] min-w-[44px] flex-shrink-0 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white active:bg-neutral-700"
          aria-label="Close"
        >
          x
        </button>
      </div>
    </div>
  );
});

PWAInstallPrompt.displayName = "PWAInstallPrompt";

export default PWAInstallPrompt;
