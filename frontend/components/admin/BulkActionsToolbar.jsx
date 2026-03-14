"use client";

import { useState } from "react";
import { Eye, EyeOff, Trash2, X } from "lucide-react";

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
  });

  const wrapOperation = async (operation, operationType) => {
    setOperationState({
      isProcessing: true,
      currentOperation: operationType,
    });

    try {
      await operation();
    } finally {
      setOperationState({
        isProcessing: false,
        currentOperation: null,
      });
    }
  };

  if (!selectedCount) {
    return null;
  }

  const isProcessing = operationState.isProcessing;
  const progressLabel =
    operationState.currentOperation === "publish"
      ? `正在发布 ${selectedCount} 部作品...`
      : operationState.currentOperation === "unpublish"
        ? `正在取消发布 ${selectedCount} 部作品...`
        : operationState.currentOperation === "delete"
          ? `正在删除 ${selectedCount} 部作品...`
          : null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slide-up">
      <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/95 px-6 py-4 shadow-ios-xl backdrop-blur-2xl">
        {progressLabel ? (
          <div className="mb-4 rounded-3xl border border-ios-blue/20 bg-ios-blue/10 px-4 py-3 text-xs font-medium text-ios-blue">
            {progressLabel}
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
              onClick={() => wrapOperation(onPublish, "publish")}
              disabled={isProcessing}
              title="发布所选作品"
              className="flex items-center gap-2 rounded-3xl border border-ios-green/20 bg-ios-green/10 px-4 py-2 text-xs font-bold text-ios-green transition-all duration-300 hover:bg-ios-green/20 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eye size={14} />
              <span>发布</span>
            </button>

            <button
              type="button"
              onClick={() => wrapOperation(onUnpublish, "unpublish")}
              disabled={isProcessing}
              title="取消发布所选作品"
              className="flex items-center gap-2 rounded-3xl border border-ios-gray-600/20 bg-ios-gray-700/10 px-4 py-2 text-xs font-bold text-ios-gray-400 transition-all duration-300 hover:bg-ios-gray-700/20 hover:text-neutral-200 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <EyeOff size={14} />
              <span>取消发布</span>
            </button>

            <button
              type="button"
              onClick={() => wrapOperation(onDelete, "delete")}
              disabled={isProcessing}
              title="删除所选作品"
              className="flex items-center gap-2 rounded-3xl border border-ios-red/20 bg-ios-red/10 px-4 py-2 text-xs font-bold text-ios-red transition-all duration-300 hover:bg-ios-red/20 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>删除</span>
            </button>
          </div>

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

