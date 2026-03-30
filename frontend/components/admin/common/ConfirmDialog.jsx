/**
 * Shared confirmation dialog for destructive admin actions.
 */

import React from "react";
import { AlertCircle } from "lucide-react";
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
    <Modal isOpen={isOpen} title={title} onClose={onCancel} size="sm" closeButton={!isLoading}>
      <div className="space-y-4">
        {isDangerous ? (
          <div className="flex items-center gap-3 rounded-[22px] border border-red-200 bg-red-50/90 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <p className="text-sm leading-6 text-red-700">
              这个操作无法撤销，请确认后再继续。
            </p>
          </div>
        ) : null}

        <p className="text-sm leading-6 text-slate-600">{message}</p>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${
              isDangerous ? "bg-red-600 hover:bg-red-500" : "bg-slate-950 hover:bg-slate-800"
            }`}
          >
            {isLoading ? "处理中..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
});

ConfirmDialog.displayName = "ConfirmDialog";
