"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

/**
 * Language Switcher Component
 * 老王注释：语言切换器组件，支持英语和中文切换
 */
export default function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const t = useTranslations('language');

  const handleLanguageChange = (newLocale) => {
    startTransition(() => {
      // 老王注释：设置 Cookie 存储用户的语言偏好
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      // 老王注释：刷新页面以应用新语言
      window.location.reload();
    });
  };

  return (
    <div className="relative">
      <select
        value={locale}
        onChange={(e) => handleLanguageChange(e.target.value)}
        disabled={isPending}
        className="appearance-none bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm rounded-lg px-3 py-2 pr-8 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={t('select')}
      >
        <option value="en">{t('english')}</option>
        <option value="zh">{t('chinese')}</option>
      </select>

      {/* 老王注释：自定义下拉箭头 */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
