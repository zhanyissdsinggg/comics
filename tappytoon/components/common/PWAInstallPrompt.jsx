"use client";

import React, { useState, useEffect, useCallback } from "react";

/**
 * 老王注释：PWA安装提示组件
 * 功能：检测PWA安装能力、提示用户安装
 * 遵循KISS原则：简洁的安装提示
 * 遵循DRY原则：统一的安装逻辑
 */
const PWAInstallPrompt = React.memo(() => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // 老王注释：检测PWA安装状态
  useEffect(() => {
    // 老王注释：检查是否已安装
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // 老王注释：检查是否为iOS设备
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // 老王注释：监听beforeinstallprompt事件（Android/Chrome）
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // 老王注释：检查用户是否之前关闭过提示
      const dismissed = localStorage.getItem("mn_pwa_prompt_dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 老王注释：监听appinstalled事件
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

  // 老王注释：处理安装
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }

    // 老王注释：显示安装提示
    deferredPrompt.prompt();

    // 老王注释：等待用户响应
    const { outcome } = await deferredPrompt.userChoice;

    // 老王注释：清除deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  }, [deferredPrompt]);

  // 老王注释：关闭提示
  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem("mn_pwa_prompt_dismissed", "true");
  }, []);

  // 老王注释：如果已安装或不显示提示，则不渲染
  if (isInstalled || !showPrompt) {
    return null;
  }

  // 老王注释：iOS安装提示
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 mb-0 md:mb-0 border-t border-neutral-800 bg-neutral-900 p-3 md:p-4 shadow-2xl">
        <div className="mx-auto flex max-w-4xl items-start gap-3 md:gap-4">
          <div className="flex-shrink-0 text-2xl md:text-3xl">📱</div>
          <div className="flex-1">
            <h3 className="mb-1 text-sm md:text-base font-semibold text-white">
              Install Gush App
            </h3>
            <p className="mb-2 text-xs md:text-sm text-neutral-400">
              Install this app on your iPhone: tap{" "}
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-neutral-800 text-xs">
                ⬆️
              </span>{" "}
              and then &quot;Add to Home Screen&quot;
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white active:bg-neutral-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // 老王注释：Android/Chrome安装提示
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mb-0 md:mb-0 border-t border-neutral-800 bg-neutral-900 p-3 md:p-4 shadow-2xl">
      <div className="mx-auto flex max-w-4xl items-start gap-3 md:gap-4">
        <div className="flex-shrink-0 text-2xl md:text-3xl">📱</div>
        <div className="flex-1">
          <h3 className="mb-1 text-sm md:text-base font-semibold text-white">
            Install Gush App
          </h3>
          <p className="mb-2 md:mb-3 text-xs md:text-sm text-neutral-400">
            Install our app for a better experience. Access your content
            offline, get faster loading, and enjoy a native app feel.
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
          className="min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white active:bg-neutral-700"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
});

PWAInstallPrompt.displayName = "PWAInstallPrompt";

export default PWAInstallPrompt;
