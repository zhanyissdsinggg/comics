"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from 'next-intl';

/**
 * Cookie Consent Banner Component
 * 老王注释：符合 GDPR/CCPA 要求的 Cookie 同意横幅
 * 首次访问时显示，用户可以接受或拒绝 Cookie
 */
export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const t = useTranslations('cookie');
  const tFooter = useTranslations('footer');

  useEffect(() => {
    // 老王注释：检查用户是否已经做出选择
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      // 老王注释：延迟 1 秒显示，避免打扰用户
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    // 老王注释：用户接受 Cookie
    localStorage.setItem("cookie_consent", "accepted");
    setShowBanner(false);
  };

  const handleDecline = () => {
    // 老王注释：用户拒绝 Cookie（仅保留必要 Cookie）
    localStorage.setItem("cookie_consent", "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
      <div className="mx-auto max-w-7xl">
        {/* 老王优化：北美风格的紧凑横幅 */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/98 backdrop-blur-md px-4 py-3 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {/* 老王优化：简化内容，去掉图标 */}
            <div className="flex-1">
              <p className="text-sm text-neutral-300">
                <span className="font-semibold text-white">{t('title')}</span>
                {" — "}
                {t('description')}{" "}
                <Link
                  href="/privacy-policy"
                  className="text-emerald-500 hover:text-emerald-400 underline"
                >
                  {t('learnMore')}
                </Link>
              </p>
            </div>

            {/* 老王优化：紧凑的按钮组 */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleDecline}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors text-sm font-medium whitespace-nowrap"
              >
                {t('decline')}
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-sm font-medium whitespace-nowrap"
              >
                {t('acceptAll')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
