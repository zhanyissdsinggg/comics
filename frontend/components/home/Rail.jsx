"use client";

import PortraitCard from "./PortraitCard";
import { ensureArray } from "../../lib/validators";

/**
 * Rail - FAKKU风格网格布局
 * 从水平滚动改为响应式网格，每行4-5个卡片
 */
export default function Rail({ title, items, tone, railName, onItemClick }) {
  const safeItems = ensureArray(items);

  return (
    <section className="space-y-4">
      {/* FAKKU风格标题 - 简洁粗体白色 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white md:text-2xl">
          {title}
        </h2>
      </div>

      {safeItems.length === 0 ? (
        <div className="rounded-lg border border-white/5 bg-neutral-900/50 p-8 text-center">
          <p className="text-neutral-500">No items available.</p>
        </div>
      ) : (
        /* FAKKU风格网格：2列(手机) → 3列(平板) → 4列(桌面) → 5列(大屏) */
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
