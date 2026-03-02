"use client";

import { useRouter } from "next/navigation";
import { Bell, User } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import ThemeToggle from "../common/ThemeToggle";
// 老王说：暂时注释掉LanguageSwitcher，它使用了next-intl
// import LanguageSwitcher from "../common/LanguageSwitcher";

/**
 * 老王注释：右侧操作按钮组件 - 只负责钱包、通知、账户、语言切换等按钮
 * 职责单一：显示操作按钮，处理按钮点击事件
 * 不处理模态框逻辑，那是HeaderModals的事儿
 */
export default function HeaderActions({
  onWalletClick,
  onAdultToggleClick,
  onLoginClick,
  isAdultMode,
}) {
  const router = useRouter();
  const { isSignedIn } = useAuthStore();
  const { paidPts, bonusPts } = useWalletStore();
  const { unreadCount } = useNotificationsStore();

  return (
    <div className="flex items-center gap-3">
      {/* 老王优化：iOS 26风格的钱包按钮 - 胶囊形状 + 毛玻璃 */}
      <button
        type="button"
        onClick={onWalletClick}
        className="group relative flex items-center gap-2 min-h-[44px] rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl px-4 py-2 transition-all duration-300 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:scale-105 hover:shadow-ios-glow active:scale-95 md:hidden touch-manipulation"
        aria-label="Wallet"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <svg
          className="h-4 w-4 text-emerald-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs font-bold text-emerald-400 tabular-nums">
          {(paidPts + bonusPts).toLocaleString()}
        </span>
      </button>

      {/* 老王优化：iOS 26风格的通知按钮 - 圆形 + 毛玻璃 */}
      <button
        type="button"
        onClick={() => router.push("/notifications")}
        className="group relative min-h-[44px] min-w-[44px] rounded-full border border-white/10 bg-white/5 backdrop-blur-xl p-2.5 text-neutral-300 transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white hover:scale-110 hover:shadow-ios active:scale-95 touch-manipulation"
        aria-label="Notifications"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Bell size={18} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
        {unreadCount > 0 ? (
          <>
            {/* iOS风格脉冲动画 */}
            <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-ping rounded-full bg-red-500 opacity-75"></span>
            {/* iOS风格未读数量徽章 */}
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-red-500/50">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        ) : null}
      </button>

      {/* 语言切换 - 桌面端隐藏 */}
      {/* 老王说：暂时注释掉LanguageSwitcher，它使用了next-intl */}
      {/* <div className="hidden sm:block">
        <LanguageSwitcher />
      </div> */}

      {/* 老王添加：主题切换按钮 */}
      <div className="hidden sm:block">
        <ThemeToggle />
      </div>

      {/* 老王优化：iOS 26风格的18+开关 - 胶囊形状 + 毛玻璃 */}
      <button
        type="button"
        onClick={onAdultToggleClick}
        className={`hidden sm:flex items-center gap-2 min-h-[44px] rounded-full border px-5 py-2.5 text-xs font-bold transition-all duration-300 touch-manipulation hover:scale-105 active:scale-95 backdrop-blur-xl ${
          isAdultMode
            ? "border-red-500/40 bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-300 shadow-lg shadow-red-500/30"
            : "border-white/10 bg-white/5 text-neutral-300 hover:border-red-500/30 hover:bg-red-500/10"
        }`}
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-label={`Adult content ${isAdultMode ? "on" : "off"}`}
      >
        <span className={`transition-transform duration-300 ${isAdultMode ? "scale-110" : ""}`}>
          18+
        </span>
        <span className={`text-[10px] font-bold ${isAdultMode ? "text-red-400" : "text-neutral-500"}`}>
          {isAdultMode ? "ON" : "OFF"}
        </span>
      </button>

      {/* 老王优化：iOS 26风格的账户按钮 */}
      {isSignedIn ? (
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:scale-110 hover:shadow-ios-glow active:scale-95"
          aria-label="Profile"
          title="View Profile"
        >
          <User size={20} className="text-emerald-400 transition-transform duration-300 group-hover:scale-110" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onLoginClick}
          className="rounded-full border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-2.5 text-sm font-bold text-neutral-200 transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white hover:scale-105 hover:shadow-ios active:scale-95"
        >
          Sign in
        </button>
      )}
    </div>
  );
}
