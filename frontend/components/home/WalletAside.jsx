"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import useCountdown from "../../hooks/useCountdown";
import { useWalletStore } from "../../store/useWalletStore";
import { formatUSNumber } from "../../lib/localization";

/**
 * 老王说：钱包侧边栏组件 - iOS风格设计
 * 这个SB组件负责展示钱包余额和免费解锁倒计时
 * 采用iOS风格：毛玻璃效果、大圆角、柔和阴影
 */
const WalletAside = memo(function WalletAside() {
  const router = useRouter();
  const { paidPts, bonusPts, plan } = useWalletStore();
  const readyAt = useMemo(() => Date.now() + 2 * 60 * 60 * 1000, []);
  const { formatted } = useCountdown(readyAt);

  return (
    <aside className="space-y-6">
      {/* 老王说：iOS风格钱包卡片 - 毛玻璃效果 + 大圆角 */}
      <div className="group relative overflow-hidden rounded-[28px] bg-gradient-to-br from-neutral-900/80 to-neutral-950/80 backdrop-blur-xl border border-white/5 p-8 shadow-2xl shadow-black/20 transition-all duration-500 hover:scale-[1.02] hover:shadow-emerald-500/10">
        {/* iOS风格光晕效果 */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl transition-all duration-700 group-hover:bg-emerald-500/20" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 transition-transform duration-300 group-hover:scale-110">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-white tracking-tight">Wallet</h3>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/10">
              <span className="text-sm font-medium text-neutral-400">Paid Points</span>
              <span className="text-2xl font-semibold text-white tabular-nums">{formatUSNumber(paidPts)}</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/10">
              <span className="text-sm font-medium text-neutral-400">Bonus Points</span>
              <span className="text-2xl font-semibold bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent tabular-nums">{formatUSNumber(bonusPts)}</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <span className="text-sm font-medium text-neutral-400">Plan</span>
              <span className="text-base font-semibold uppercase tracking-wider text-white">{plan}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 老王说：iOS风格倒计时卡片 */}
      <div className="group relative overflow-hidden rounded-[28px] bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 p-8 shadow-2xl shadow-black/20 transition-all duration-500 hover:scale-[1.02] hover:shadow-amber-500/20">
        {/* iOS风格光晕效果 */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl transition-all duration-700 group-hover:bg-amber-500/30" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-white tracking-tight">Free Unlock</h3>
          </div>

          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-amber-200/80">Next unlock in</p>
          <p className="mb-8 font-mono text-5xl font-bold tracking-tight text-white tabular-nums drop-shadow-lg">{formatted || "--:--:--"}</p>

          <button
            type="button"
            onClick={() => router.push("/subscribe")}
            className="group/btn relative w-full overflow-hidden rounded-[20px] bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/40 active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2 uppercase tracking-wide">
              Get Premium
              <svg className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            {/* iOS风格按钮光晕 */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100" />
          </button>
        </div>
      </div>
    </aside>
  );
});

export default WalletAside;
