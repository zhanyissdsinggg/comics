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
        className={`relative w-full ${sizeClasses[size]} overflow-hidden border-[3px] border-black bg-white shadow-[12px_12px_0_0_rgba(0,0,0,1)] transition-all duration-300 sm:rounded-3xl ${
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
          <div className="relative flex items-center justify-between border-b-[3px] border-black px-6 py-4">
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
                className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-[3px] border-black bg-white p-2 text-black/55 transition duration-200 hover:-translate-y-0.5 hover:bg-[#ffe7ec] hover:text-black active:scale-95"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            ) : null}
          </div>
        )}

        <div className="relative max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>

        {footer ? (
          <div className="relative border-t-[3px] border-black px-6 py-4">
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
      "border-[3px] border-black bg-black text-white shadow-[6px_6px_0_0_rgba(255,0,122,1)] hover:-translate-y-0.5 hover:bg-[#ff007a]",
    danger:
      "border-[3px] border-black bg-[#ff007a] text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:bg-[#e0006b]",
    warning:
      "border-[3px] border-black bg-[#ffe500] text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:bg-[#f5d800]",
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
            className="flex-1 rounded-full border-[3px] border-black bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-black transition duration-200 hover:-translate-y-0.5 hover:bg-[#fff6cf] active:scale-95"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-all duration-300 active:scale-95 ${variantClasses[variant]}`}
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
