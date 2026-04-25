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
        isAnimating
          ? "bg-black/72 backdrop-blur-md"
          : "bg-black/0"
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
        className={`relative w-full ${sizeClasses[size]} overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)] transition-all duration-300 sm:rounded-3xl ${
          isAnimating
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-full opacity-0 sm:translate-y-0 sm:scale-95"
        } ${className}`}
        style={{
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),transparent_32%)]" />
        <div className="flex justify-center pb-2 pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-black/18" />
        </div>

        {(title || showCloseButton) && (
          <div className="relative flex items-center justify-between border-b border-black/8 px-6 py-4">
            {title ? (
              <h2
                id="modal-title"
                className="font-display text-xl font-black uppercase tracking-[-0.05em] text-black"
              >
                {title}
              </h2>
            ) : null}
            {showCloseButton ? (
              <button
                type="button"
                onClick={handleClose}
                className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-black/10 bg-white p-2 text-black/55 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition duration-200 hover:border-black/16 hover:bg-black/[0.03] hover:text-black active:scale-95"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            ) : null}
          </div>
        )}

        <div className="relative max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>

        {footer ? (
          <div className="relative border-t border-black/8 px-6 py-4">
            {footer}
          </div>
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
    default:
      "border border-black bg-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] hover:bg-black/90",
    danger:
      "border border-rose-200/80 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] text-rose-700 shadow-[0_10px_24px_rgba(244,63,94,0.1)] hover:bg-[linear-gradient(180deg,#fff0f4_0%,#ffe7ee_100%)]",
    warning:
      "border border-amber-200/80 bg-[linear-gradient(180deg,#fffdf7_0%,#fff8eb_100%)] text-black shadow-[0_10px_24px_rgba(245,158,11,0.1)] hover:bg-[linear-gradient(180deg,#fff8ef_0%,#fff3de_100%)]",
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
            className="flex-1 rounded-full border border-black/12 bg-white px-6 py-3 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:border-black/18 hover:bg-black/[0.03] active:scale-95"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 rounded-full px-6 py-3 text-sm font-semibold tracking-[0.02em] transition-all duration-300 active:scale-95 ${variantClasses[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-7 text-black/68">{message}</p>
    </Modal>
  );
});

export default Modal;
