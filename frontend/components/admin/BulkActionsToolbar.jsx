"use client";

import { useState } from "react";
import { Eye, EyeOff, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

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
        ? `正在把 ${selectedCount} 部作品转回草稿...`
        : operationState.currentOperation === "delete"
          ? `正在删除 ${selectedCount} 部作品...`
          : null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[min(92vw,760px)] -translate-x-1/2">
      <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-white/95 px-5 py-4 shadow-[0_22px_52px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] backdrop-blur-2xl">
        {progressLabel ? (
          <div className="mb-4 rounded-[18px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-700">
            {progressLabel}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 min-w-11 items-center justify-center rounded-full border border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,#ffffff,#f6f7fa)] text-sm font-semibold text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
              {selectedCount}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                批量操作
              </p>
              <p className="text-sm font-semibold text-slate-950">
                已选择 {selectedCount} 部作品
              </p>
              <p className="text-xs text-slate-500">
                先确认选择无误，再统一发布、转草稿或删除。
              </p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[auto_auto_auto] lg:justify-end">
            <div className="rounded-[20px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f8f8fa)] p-2 shadow-[0_8px_20px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                发布动作
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => wrapOperation(onPublish, "publish")}
                  disabled={isProcessing}
                  title="发布已选作品"
                >
                  <Eye className="size-4" />
                  <span>发布</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => wrapOperation(onUnpublish, "unpublish")}
                  disabled={isProcessing}
                  title="将已选作品转回草稿"
                >
                  <EyeOff className="size-4" />
                  <span>转草稿</span>
                </Button>
              </div>
            </div>

            <div className="rounded-[20px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f8f8fa)] p-2 shadow-[0_8px_20px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                选择控制
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isProcessing}
                title="清空选择"
              >
                <X className="size-4" />
                <span>清空选择</span>
              </Button>
            </div>

            <div className="rounded-[20px] border border-rose-200 bg-rose-50/72 p-2 shadow-[0_8px_20px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500">
                危险操作
              </p>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => wrapOperation(onDelete, "delete")}
                disabled={isProcessing}
                title="删除已选作品"
              >
                <Trash2 className="size-4" />
                <span>删除作品</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
