/**
 * Shared confirmation dialog for destructive admin actions.
 */

import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "./Modal";

export const ConfirmDialog = React.memo(function ConfirmDialog({
  isOpen,
  title = "确认操作",
  message,
  confirmText = "确认",
  cancelText = "取消",
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      subtitle={
        isDangerous ? "请再次确认，操作后无法恢复。" : "确认后会立即执行。"
      }
      onClose={onCancel}
      size="sm"
      closeButton={!isLoading}
    >
      <div className="space-y-5">
        {isDangerous ? (
          <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50/90 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-700">高风险操作</p>
              <p className="text-sm leading-6 text-red-700">
                删除或覆盖后不会自动恢复，请先确认影响范围。
              </p>
            </div>
          </div>
        ) : null}

        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
          <p className="text-sm leading-6 text-slate-700">{message}</p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            variant={isDangerous ? "destructive" : "default"}
            className="flex-1"
          >
            {isLoading ? "处理中..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

ConfirmDialog.displayName = "ConfirmDialog";
