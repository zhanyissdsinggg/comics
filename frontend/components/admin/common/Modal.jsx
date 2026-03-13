/**
 * Shared admin modal component.
 * Keep the API small so admin flows stay predictable.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full rounded-[20px] bg-neutral-900/95 p-6 shadow-2xl ${sizeClasses[size]}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? <h3 className="text-lg font-semibold text-neutral-100">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm text-neutral-400">{subtitle}</p> : null}
          </div>
          {closeButton ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
              aria-label="关闭弹窗"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className="text-neutral-300">{children}</div>
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';
