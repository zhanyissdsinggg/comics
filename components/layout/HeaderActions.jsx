"use client";

import { useRouter } from "next/navigation";
import { Bell, User } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import LanguageSwitcher from "../common/LanguageSwitcher";

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
    <div className="flex items-center gap-2 md:gap-3">
      {/* 手机端钱包余额显示 - iOS风格 */}
      <button
        type="button"
        onClick={onWalletClick}
        className="group relative flex items-center gap-1.5 min-h-[44px] rounded-[20px] border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 transition-all duration-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:scale-[1.05] active:scale-[0.95] md:hidden touch-manipulation"
        aria-label="Wallet"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <svg
          className="h-4 w-4 text-emerald-400 transition-transform duration-300 group-hover:scale-110"
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
        <span className="text-xs font-semibold text-emerald-400 tabular-nums">
          {(paidPts + bonusPts).toLocaleString()}
        </span>
      </button>

      {/* 通知按钮 */}
      <button
        type="button"
        onClick={() => router.push("/notifications")}
        className="group relative min-h-[44px] min-w-[44px] rounded-[20px] border border-white/5 bg-white/5 p-2 text-neutral-300 transition-all duration-300 hover:border-emerald-500/20 hover:bg-emerald-500/10 hover:text-white touch-manipulation hover:scale-[1.05] active:scale-[0.95]"
        aria-label="Notifications"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Bell size={16} className="transition-transform duration-300 group-hover:scale-110" />
        {unreadCount > 0 ? (
          <>
            {/* iOS风格脉冲动画 */}
            <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-ping rounded-full bg-red-500 opacity-75"></span>
            {/* iOS风格未读数量徽章 */}
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-red-400 to-red-500 px-1 text-[10px] font-semibold text-white shadow-lg shadow-red-500/30">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        ) : null}
      </button>

      {/* 语言切换 - 桌面端隐藏 */}
      <div className="hidden sm:block">
        <LanguageSwitcher />
      </div>

      {/* 18+ 开关 - 桌面端显示 */}
      <button
        type="button"
        onClick={onAdultToggleClick}
        className={`hidden sm:block min-h-[44px] rounded-[16px] border px-4 py-2 text-xs font-semibold transition-all duration-300 touch-manipulation hover:scale-[1.05] active:scale-[0.95] ${
          isAdultMode
            ? "border-red-500/30 bg-red-500/10 text-red-300 shadow-lg shadow-red-500/20"
            : "border-white/5 bg-white/5 text-neutral-300 hover:border-red-500/20 hover:bg-red-500/5"
        }`}
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-label={`Adult content ${isAdultMode ? "on" : "off"}`}
      >
        18+ {isAdultMode ? "ON" : "OFF"}
      </button>

      {/* 账户按钮 */}
      {isSignedIn ? (
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[20px] border border-emerald-500/20 bg-emerald-500/5 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:scale-[1.05] active:scale-[0.95]"
          aria-label="Profile"
          title="View Profile"
        >
          <User size={18} className="text-emerald-400 transition-transform duration-300 group-hover:scale-110" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onLoginClick}
          className="rounded-[16px] border border-white/5 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-200 transition-all duration-300 hover:border-emerald-500/20 hover:bg-emerald-500/5 hover:text-white hover:scale-[1.05] active:scale-[0.95]"
        >
          Sign in
        </button>
      )}
    </div>
  );
}
