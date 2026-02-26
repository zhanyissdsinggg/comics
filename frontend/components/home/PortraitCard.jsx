/**
 * PortraitCard - FAKKU风格卡片组件
 * 简洁设计：大封面图 + 标题 + 副标题（作者/类型）
 */
import { memo } from "react";
import Cover from "../common/Cover";
import Pill from "../common/Pill";

function PortraitCard({ item, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left transition-transform duration-200 hover:-translate-y-1 active:scale-[0.98]"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* 封面图 - FAKKU风格：大图，轻微圆角 */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-neutral-800">
        <Cover
          tone={tone || item.coverTone}
          coverUrl={item.coverUrl}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* 右下角标签 - FAKKU风格：小标签显示类型 */}
        {item.badge && (
          <div className="absolute bottom-2 right-2">
            <Pill>{item.badge}</Pill>
          </div>
        )}

        {/* 阅读进度条 */}
        {typeof item.progressPercent === "number" && item.progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-900/80">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.round(item.progressPercent * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* 标题和副标题 - FAKKU风格：标题用品牌色，副标题用灰色 */}
      <div className="mt-2 space-y-0.5">
        <p className="truncate text-sm font-medium text-emerald-400 transition-colors group-hover:text-emerald-300">
          {item.title}
        </p>
        <p className="truncate text-xs text-neutral-500">
          {item.subtitle}
        </p>
      </div>
    </button>
  );
}

export default memo(PortraitCard);
