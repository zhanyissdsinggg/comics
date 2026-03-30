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
      ? `正在发布 ${selectedCount} 个已选作品...`
      : operationState.currentOperation === "unpublish"
        ? `正在将 ${selectedCount} 个已选作品移回草稿...`
        : operationState.currentOperation === "delete"
          ? `正在删除 ${selectedCount} 个已选作品...`
          : null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="min-w-[320px] rounded-[28px] border border-black/8 bg-white/96 px-5 py-4 shadow-[var(--gush-shadow-panel)] backdrop-blur-xl">
        {progressLabel ? (
          <div className="mb-4 rounded-[18px] border border-[rgba(47,88,198,0.12)] bg-[rgba(47,88,198,0.06)] px-4 py-3 text-sm text-[var(--gush-accent,#2f58c6)]">
            {progressLabel}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(47,88,198,0.08)] text-sm font-semibold text-[var(--gush-accent,#2f58c6)]">
              {selectedCount}
            </div>
            <span className="text-sm font-medium text-slate-700">
              已选 {selectedCount} 项
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => wrapOperation(onPublish, "publish")}
              disabled={isProcessing}
              title="发布已选作品"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eye size={14} />
              <span>发布</span>
            </button>

            <button
              type="button"
              onClick={() => wrapOperation(onUnpublish, "unpublish")}
              disabled={isProcessing}
              title="将已选作品移回草稿"
              className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <EyeOff size={14} />
              <span>转为草稿</span>
            </button>

            <button
              type="button"
              onClick={() => wrapOperation(onDelete, "delete")}
              disabled={isProcessing}
              title="删除已选作品"
              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>删除</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              title="清空选择"
              className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={14} />
              <span>清空</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
