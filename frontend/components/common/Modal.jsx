"use client";

import { memo, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export const Modal = memo(function Modal({
  isOpen = false,
  onClose,
  title,
  children,
  footer,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className = "",
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "mx-4 max-w-full",
  };

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      setTimeout(() => {
        if (!modalRef.current) {
          return;
        }
        const firstFocusable = modalRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        firstFocusable?.focus?.();
      }, 100);
      return;
    }

    previousActiveElement.current?.focus?.();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => setIsAnimating(true), 50);
    } else {
      document.body.style.overflow = "";
      setIsAnimating(false);
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!closeOnEsc || !isOpen) {
      return undefined;
    }

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeOnEsc, isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      handleClose();
    }
  };

  const handleContentClick = (event) => {
    event.stopPropagation();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end justify-center p-0 transition-all duration-300 sm:items-center sm:p-4 ${
        isAnimating ? "bg-black/60 backdrop-blur-sm" : "bg-black/0"
      }`}
      onClick={handleOverlayClick}
      style={{ WebkitTapHighlightColor: "transparent" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        ref={modalRef}
        onClick={handleContentClick}
        className={`relative w-full ${sizeClasses[size]} border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] shadow-[0_34px_90px_rgba(15,23,42,0.18)] transition-all duration-300 sm:rounded-3xl ${
          isAnimating
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-full opacity-0 sm:translate-y-0 sm:scale-95"
        } ${className}`}
        style={{
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem",
        }}
      >
        <div className="flex justify-center pb-2 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-black/12" />
        </div>

        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-black/6 px-6 py-4">
            {title ? (
              <h2
                id="modal-title"
                className="font-display text-xl font-semibold tracking-tight text-slate-950"
              >
                {title}
              </h2>
            ) : null}
            {showCloseButton ? (
              <button
                type="button"
                onClick={handleClose}
                className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-slate-400 transition-all duration-300 hover:bg-black/5 hover:text-slate-700 active:scale-95"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            ) : null}
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>

        {footer ? (
          <div className="border-t border-black/6 px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
});

export const ConfirmModal = memo(function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}) {
  const variantClasses = {
    default: "bg-slate-950 hover:bg-slate-800",
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-amber-500 hover:bg-amber-600",
  };

  const handleConfirm = () => {
    onConfirm?.();
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-black/8 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-all duration-300 hover:border-black/12 hover:bg-[#f8f9fc] active:scale-95"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all duration-300 active:scale-95 ${variantClasses[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-7 text-slate-600">{message}</p>
    </Modal>
  );
});

export default Modal;
