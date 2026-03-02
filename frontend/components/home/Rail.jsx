"use client";

import { useRouter } from "next/navigation";
import PortraitCard from "./PortraitCard";
import { ensureArray } from "../../lib/validators";

/**
 * Rail - 参考 Webtoon/Tapas 的 section 设计
 * - 左侧彩色竖线装饰标题
 * - 右侧 "See All" 按钮
 * - 网格卡片布局
 * - 老王添加：推荐理由标签
 */
export default function Rail({ title, items, tone, railName, onItemClick, reason }) {
  const router = useRouter();
  const safeItems = ensureArray(items);

  return (
    <section className="space-y-4">
      {/* Section 标题行 - 老王优化：添加推荐理由 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 左侧品牌色竖线 - 像 Webtoon 那样 */}
          <div className="h-6 w-1 rounded-full bg-emerald-500" />
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold tracking-tight text-white md:text-xl">
              {title}
            </h2>
            {/* 老王添加：推荐理由标签 */}
            {reason && (
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {reason}
              </span>
            )}
          </div>
        </div>

        {/* See All 按钮 */}
        <button
          type="button"
          onClick={() => router.push("/comics")}
          className="flex items-center gap-1 text-xs font-medium text-neutral-400 transition-colors hover:text-emerald-400"
        >
          See All
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {safeItems.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-8 text-center">
          <p className="text-sm text-neutral-500">No items available.</p>
        </div>
      ) : (
        /* 响应式网格：2列(手机) → 3列(平板) → 4列(桌面) → 5列(大屏) */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {safeItems.map((item) => (
            <PortraitCard
              key={item.id}
              item={item}
              tone={tone}
              onClick={() => onItemClick?.(item, railName || title)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
