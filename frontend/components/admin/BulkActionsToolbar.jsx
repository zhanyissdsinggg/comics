"use client";

import { useState } from "react";
import { Eye, EyeOff, RotateCcw, Trash2, X } from "lucide-react";

export default function BulkActionsToolbar({
  selectedCount,
  onPublish,
  onUnpublish,
  onDelete,
  onCancel,
}) {
  const [operationState, setOperationState] = useState({
    isProcessing: false,
    currentOperation: null,
    progress: 0,
    completed: 0,
    total: 0,
  });
  const [undoHistory, setUndoHistory] = useState([]);

  const wrapOperation = async (operation, operationType, total) => {
    setOperationState({
      isProcessing: true,
      currentOperation: operationType,
      progress: 0,
      completed: 0,
      total,
    });

    try {
      const progressInterval = setInterval(() => {
        setOperationState((current) => ({
          ...current,
          progress: Math.min(current.progress + Math.random() * 30, 90),
        }));
      }, 200);

      await operation();
      clearInterval(progressInterval);

      setOperationState({
        isProcessing: false,
        currentOperation: null,
        progress: 100,
        completed: total,
        total,
      });

      setUndoHistory((current) => [...current, { type: operationType, timestamp: Date.now(), count: total }]);

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
      console.error("批量操作失败:", error);
      setOperationState({
        isProcessing: false,
        currentOperation: null,
        progress: 0,
        completed: 0,
        total: 0,
      });
    }
  };

  if (!selectedCount) {
    return null;
  }

  const isProcessing = operationState.isProcessing;
  const progressLabel =
    operationState.currentOperation === "publish"
      ? "发布中..."
      : operationState.currentOperation === "unpublish"
        ? "取消发布中..."
        : operationState.currentOperation === "delete"
          ? "删除中..."
          : null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slide-up">
      <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/95 px-6 py-4 shadow-ios-xl backdrop-blur-2xl">
        {isProcessing ? (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ios-gray-400">{progressLabel}</span>
              <span className="font-semibold text-ios-blue">{Math.round(operationState.progress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ios-gray-800/50">
              <div
                className="h-full bg-gradient-to-r from-ios-blue to-ios-purple transition-all duration-300"
                style={{ width: `${operationState.progress}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ios-green/20 text-sm font-bold text-ios-green">
              {selectedCount}
            </div>
            <span className="text-sm font-medium text-neutral-200">已选择 {selectedCount} 项</span>
          </div>

          <div className="h-8 w-px bg-ios-gray-700" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => wrapOperation(onPublish, "publish", selectedCount)}
              disabled={isProcessing}
              title="发布所选项"
              className="flex items-center gap-2 rounded-3xl border border-ios-green/20 bg-ios-green/10 px-4 py-2 text-xs font-bold text-ios-green transition-all duration-300 hover:bg-ios-green/20 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eye size={14} />
              <span>发布</span>
            </button>

            <button
              type="button"
              onClick={() => wrapOperation(onUnpublish, "unpublish", selectedCount)}
              disabled={isProcessing}
              title="取消发布所选项"
              className="flex items-center gap-2 rounded-3xl border border-ios-gray-600/20 bg-ios-gray-700/10 px-4 py-2 text-xs font-bold text-ios-gray-400 transition-all duration-300 hover:bg-ios-gray-700/20 hover:text-neutral-200 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <EyeOff size={14} />
              <span>取消发布</span>
            </button>

            <button
              type="button"
              onClick={() => wrapOperation(onDelete, "delete", selectedCount)}
              disabled={isProcessing}
              title="删除所选项"
              className="flex items-center gap-2 rounded-3xl border border-ios-red/20 bg-ios-red/10 px-4 py-2 text-xs font-bold text-ios-red transition-all duration-300 hover:bg-ios-red/20 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>删除</span>
            </button>
          </div>

          <div className="h-8 w-px bg-ios-gray-700" />

          {undoHistory.length > 0 ? (
            <button
              type="button"
              onClick={() => setUndoHistory((current) => current.slice(0, -1))}
              title={`撤销上一步操作（${undoHistory[undoHistory.length - 1].count} 项）`}
              className="flex items-center gap-2 rounded-3xl border border-ios-orange/20 bg-ios-orange/10 px-4 py-2 text-xs font-bold text-ios-orange transition-all duration-300 hover:bg-ios-orange/20 hover:scale-105 hover:shadow-ios-sm active:scale-95"
            >
              <RotateCcw size={14} />
              <span>撤销</span>
            </button>
          ) : null}

          <div className="h-8 w-px bg-ios-gray-700" />

          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            title="清空选择"
            className="flex items-center gap-2 rounded-3xl border border-ios-gray-600/20 bg-ios-gray-700/10 px-4 py-2 text-xs font-bold text-ios-gray-400 transition-all duration-300 hover:bg-ios-gray-700/20 hover:text-neutral-200 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={14} />
            <span>清空</span>
          </button>
        </div>
      </div>
    </div>
  );
}
