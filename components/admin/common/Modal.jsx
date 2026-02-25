/**
 * 通用Modal组件
 * 所有admin页面的模态框都用这个SB组件
 */

import React from 'react';
import { X } from 'lucide-react';

export const Modal = React.memo(function Modal({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  size = 'md',
  closeButton = true,
}) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`rounded-[20px] bg-neutral-900/95 p-6 shadow-2xl ${sizeClasses[size]}`}>
        {/* 标题栏 */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-neutral-100">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
          </div>
          {closeButton && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 内容 */}
        <div className="text-neutral-300">{children}</div>
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';
