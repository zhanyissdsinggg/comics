/**
 * 通用确认对话框组件
 * 所有删除、封禁等危险操作都用这个SB组件
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from './Modal';

export const ConfirmDialog = React.memo(function ConfirmDialog({
  isOpen,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onCancel} size="sm" closeButton={!isLoading}>
      <div className="space-y-4">
        {/* 警告图标 */}
        {isDangerous && (
          <div className="flex items-center gap-3 rounded-lg bg-red-900/20 p-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-300">此操作无法撤销，请谨慎确认</p>
          </div>
        )}

        {/* 消息内容 */}
        <p className="text-neutral-300">{message}</p>

        {/* 按钮组 */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isLoading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';
