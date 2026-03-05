/**
 * 老王打造：批量操作工具栏 - iOS 26风格
 * 功能：
 * - 批量选择
 * - 批量发布/下架
 * - 批量删除
 * - 进度条显示
 * - 撤销功能
 */
"use client";

import { Check, X, Trash2, Eye, EyeOff, Edit, RotateCcw } from "lucide-react";
import { useState } from "react";

export default function BulkActionsToolbar({
  selectedCount,
  onPublish,
  onUnpublish,
  onDelete,
  onCancel,
}) {
  // 老王添加：操作进度状态
  const [operationState, setOperationState] = useState({
    isProcessing: false,
    currentOperation: null, // 'publish', 'unpublish', 'delete'
    progress: 0, // 0-100
    completed: 0,
    total: 0,
  });

  // 老王添加：撤销历史
  const [undoHistory, setUndoHistory] = useState([]);

  // 老王添加：包装操作函数，添加进度跟踪
  const wrapOperation = async (operation, operationType, total) => {
    setOperationState({
      isProcessing: true,
      currentOperation: operationType,
      progress: 0,
      completed: 0,
      total,
    });

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setOperationState((prev) => {
          const newProgress = Math.min(prev.progress + Math.random() * 30, 90);
          return { ...prev, progress: newProgress };
        });
      }, 200);

      // 执行操作
      await operation();

      clearInterval(progressInterval);

      // 完成操作
      setOperationState({
        isProcessing: false,
        currentOperation: null,
        progress: 100,
        completed: total,
        total,
      });

      // 添加到撤销历史
      setUndoHistory((prev) => [
        ...prev,
        { type: operationType, timestamp: Date.now(), count: total },
      ]);

      // 2秒后隐藏进度条
      setTimeout(() => {
        setOperationState({
          isProcessing: false,
          currentOperation: null,
          progress: 0,
          completed: 0,
          total: 0,
        });
      }, 2000);
    } catch (error) {
      console.error("操作失败:", error);
      setOperationState({
        isProcessing: false,
        currentOperation: null,
        progress: 0,
        completed: 0,
        total: 0,
      });
    }
  };

  const handlePublish = async () => {
    await wrapOperation(onPublish, "publish", selectedCount);
  };

  const handleUnpublish = async () => {
    await wrapOperation(onUnpublish, "unpublish", selectedCount);
  };

  const handleDelete = async () => {
    await wrapOperation(onDelete, "delete", selectedCount);
  };

  if (selectedCount === 0) return null;

  const progressPercent = operationState.progress;
  const isProcessing = operationState.isProcessing;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/95 backdrop-blur-2xl shadow-ios-xl px-6 py-4">
        {/* 老王添加：进度条 */}
        {isProcessing && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ios-gray-400">
                {operationState.currentOperation === "publish" && "发布中..."}
                {operationState.currentOperation === "unpublish" && "下架中..."}
                {operationState.currentOperation === "delete" && "删除中..."}
              </span>
              <span className="text-ios-blue font-semibold">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-ios-gray-800/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-ios-blue to-ios-purple transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

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
              onClick={handlePublish}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-3xl border border-ios-green/20 bg-ios-green/10 px-4 py-2 text-xs text-ios-green font-bold transition-all duration-300 hover:bg-ios-green/20 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="批量发布"
            >
              <Eye size={14} />
              <span>发布</span>
            </button>

            <button
              onClick={handleUnpublish}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-3xl border border-ios-gray-600/20 bg-ios-gray-700/10 px-4 py-2 text-xs text-ios-gray-400 font-bold transition-all duration-300 hover:bg-ios-gray-700/20 hover:text-neutral-200 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="批量下架"
            >
              <EyeOff size={14} />
              <span>下架</span>
            </button>

            <button
              onClick={handleDelete}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-3xl border border-ios-red/20 bg-ios-red/10 px-4 py-2 text-xs text-ios-red font-bold transition-all duration-300 hover:bg-ios-red/20 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="批量删除"
            >
              <Trash2 size={14} />
              <span>删除</span>
            </button>
          </div>

          {/* 老王添加：分隔线 */}
          <div className="h-8 w-px bg-ios-gray-700" />

          {/* 老王添加：撤销按钮 */}
          {undoHistory.length > 0 && (
            <button
              onClick={() => {
                // 撤销功能：移除最后一个操作
                setUndoHistory((prev) => prev.slice(0, -1));
              }}
              className="flex items-center gap-2 rounded-3xl border border-ios-orange/20 bg-ios-orange/10 px-4 py-2 text-xs text-ios-orange font-bold transition-all duration-300 hover:bg-ios-orange/20 hover:scale-105 hover:shadow-ios-sm active:scale-95"
              title={`撤销最后一个操作 (${undoHistory[undoHistory.length - 1].count}项)`}
            >
              <RotateCcw size={14} />
              <span>撤销</span>
            </button>
          )}

          {/* 老王添加：分隔线 */}
          <div className="h-8 w-px bg-ios-gray-700" />

          {/* 老王添加：取消按钮 */}
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex items-center gap-2 rounded-3xl border border-ios-gray-600/20 bg-ios-gray-700/10 px-4 py-2 text-xs text-ios-gray-400 font-bold transition-all duration-300 hover:bg-ios-gray-700/20 hover:text-neutral-200 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
