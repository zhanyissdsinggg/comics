"use client";

import { X } from "lucide-react";

export default function ModalBase({ open, title, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    // 老王注释：背景遮罩 - 半透明黑色 + 模糊效果 + 淡入动画
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-fade-in"
      onClick={onClose}
    >
      {/* 老王注释：模态框主体 - 玻璃态 + 品牌色边框 + 发光阴影 + 滑入动画 */}
      <div
        className="w-full max-w-lg rounded-3xl border border-brand-primary/30 bg-neutral-900/95 backdrop-blur-xl p-6 shadow-glow-lg animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 老王注释：标题栏 - 品牌色渐变文字 + 优雅关闭按钮 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold bg-brand-gradient bg-clip-text text-transparent">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="group rounded-full p-2 text-neutral-400 transition-all duration-300 hover:bg-neutral-800 hover:text-brand-primary hover:scale-110 active:scale-95"
            aria-label="Close modal"
          >
            <X size={20} className="transition-transform duration-300 group-hover:rotate-90" />
          </button>
        </div>
        {/* 老王注释：内容区域 */}
        <div className="space-y-4 text-sm text-neutral-300">{children}</div>
      </div>
    </div>
  );
}
