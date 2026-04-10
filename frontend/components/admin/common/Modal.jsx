/**
 * Shared admin modal component.
 * Keep the API small so admin flows stay predictable.
 */

import React from "react";
import { X } from "lucide-react";

export const Modal = React.memo(function Modal({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  size = "md",
  closeButton = true,
}) {
  if (!isOpen) return null;

  const hasHeader = Boolean(title || subtitle || closeButton);
  const handleRequestClose = closeButton ? onClose : undefined;
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,27,36,0.36)] px-4 py-6 backdrop-blur-md"
      onClick={handleRequestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-h-[calc(100vh-3rem)] overflow-hidden rounded-[30px] border border-[color:var(--gush-border)] bg-white shadow-[var(--gush-shadow-panel)] ${sizeClasses[size]}`}
        onClick={(event) => event.stopPropagation()}
      >
        {hasHeader ? (
          <div className="flex items-start justify-between gap-4 border-b border-[color:var(--gush-border)] px-6 pb-5 pt-6">
            <div className="min-w-0">
              {title ? <h3 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">{title}</h3> : null}
              {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{subtitle}</p> : null}
            </div>
            {closeButton ? (
              <button
                type="button"
                onClick={handleRequestClose}
                className="shrink-0 rounded-full border border-[color:var(--gush-border)] bg-white p-2 text-slate-500 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"
                aria-label="关闭弹窗"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="max-h-[calc(100vh-11rem)] overflow-y-auto px-6 pb-6 pt-5 text-slate-700">
          {children}
        </div>
      </div>
    </div>
  );
});

Modal.displayName = "Modal";
