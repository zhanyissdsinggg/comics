/**
 * 老王打造：批量操作工具栏 - iOS 26风格
 * 功能：
 * - 批量选择
 * - 批量发布/下架
 * - 批量删除
 * - 批量修改状态
 */
"use client";

import { Check, X, Trash2, Eye, EyeOff, Edit } from "lucide-react";

export default function BulkActionsToolbar({
  selectedCount,
  onPublish,
  onUnpublish,
  onDelete,
  onCancel,
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/95 backdrop-blur-2xl shadow-ios-xl px-6 py-4">
        <div className="flex items-center gap-4">
          {/* 老王添加：选中数量显示 */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ios-green/20 text-ios-green font-bold text-sm">
              {selectedCount}
            </div>
            <span className="text-sm text-neutral-200 font-medium">
              已选中 {selectedCount} 项
            </span>
          </div>

          {/* 老王添加：分隔线 */}
          <div className="h-8 w-px bg-ios-gray-700" />

          {/* 老王添加：批量操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPublish}
              className="flex items-center gap-2 rounded-3xl border border-ios-green/20 bg-ios-green/10 px-4 py-2 text-xs text-ios-green font-bold transition-all duration-300 hover:bg-ios-green/20 hover:scale-105 hover:shadow-ios-sm active:scale-95"
              title="批量发布"
            >
              <Eye size={14} />
              <span>发布</span>
            </button>

            <button
              onClick={onUnpublish}
              className="flex items-center gap-2 rounded-3xl border border-ios-gray-600/20 bg-ios-gray-700/10 px-4 py-2 text-xs text-ios-gray-400 font-bold transition-all duration-300 hover:bg-ios-gray-700/20 hover:text-neutral-200 hover:scale-105 hover:shadow-ios-sm active:scale-95"
              title="批量下架"
            >
              <EyeOff size={14} />
              <span>下架</span>
            </button>

            <button
              onClick={onDelete}
              className="flex items-center gap-2 rounded-3xl border border-ios-red/20 bg-ios-red/10 px-4 py-2 text-xs text-ios-red font-bold transition-all duration-300 hover:bg-ios-red/20 hover:scale-105 hover:shadow-ios-sm active:scale-95"
              title="批量删除"
            >
              <Trash2 size={14} />
              <span>删除</span>
            </button>
          </div>

          {/* 老王添加：分隔线 */}
          <div className="h-8 w-px bg-ios-gray-700" />

          {/* 老王添加：取消按钮 */}
          <button
            onClick={onCancel}
            className="flex items-center gap-2 rounded-3xl border border-ios-gray-600/20 bg-ios-gray-700/10 px-4 py-2 text-xs text-ios-gray-400 font-bold transition-all duration-300 hover:bg-ios-gray-700/20 hover:text-neutral-200 hover:scale-105 hover:shadow-ios-sm active:scale-95"
            title="取消选择"
          >
            <X size={14} />
            <span>取消</span>
          </button>
        </div>
      </div>
    </div>
  );
}
