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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,27,36,0.28)] px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full rounded-[28px] border border-black/8 bg-white/96 p-6 shadow-[var(--gush-shadow-panel)] ${sizeClasses[size]}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? <h3 className="text-xl font-semibold text-slate-950">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
          </div>
          {closeButton ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-black/8 bg-white p-2 text-slate-500 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className="text-slate-700">{children}</div>
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';

