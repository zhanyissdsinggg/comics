"use client";

import { memo, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "./StorefrontPagePrimitives";

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
          ? "bg-[rgba(6,7,16,0.76)] backdrop-blur-xl"
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
        className={`relative w-full ${sizeClasses[size]} overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,17,31,0.98)_0%,rgba(10,10,19,0.96)_100%)] text-white shadow-[0_28px_72px_rgba(5,5,15,0.42)] backdrop-blur-2xl transition-all duration-300 sm:rounded-[32px] ${
          isAnimating
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-full opacity-0 sm:translate-y-0 sm:scale-95"
        } ${className}`}
        style={{
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,99,168,0.15),transparent_30%),radial-gradient(circle_at_top_right,rgba(92,228,255,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-[1px] rounded-[27px] border border-white/6 sm:rounded-[31px]" />
        <div className="flex justify-center pb-2 pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-white/15" />
        </div>

        {(title || showCloseButton) && (
          <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-4">
            {title ? (
              <h2
                id="modal-title"
                className="font-display text-xl font-semibold tracking-[-0.05em] text-white sm:text-[1.6rem]"
              >
                {title}
              </h2>
            ) : null}
            {showCloseButton ? (
              <button
                type="button"
                onClick={handleClose}
                className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.06)] p-2 text-white shadow-[0_14px_32px_rgba(8,6,20,0.26)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-cyan-300/28 hover:bg-[rgba(255,255,255,0.11)] active:scale-95"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            ) : null}
          </div>
        )}

        <div className="relative max-h-[70vh] overflow-y-auto px-6 py-4">
          {children}
        </div>

        {footer ? (
          <div className="relative border-t border-white/10 px-6 py-4">
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
    default: storefrontPrimaryButtonClass,
    danger:
      "inline-flex items-center justify-center rounded-full border border-[rgba(255,120,164,0.28)] bg-[linear-gradient(135deg,#ff487f_0%,#ff6f98_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(255,72,127,0.28)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_40px_rgba(255,72,127,0.32)] active:scale-95",
    warning:
      "inline-flex items-center justify-center rounded-full border border-[rgba(255,217,120,0.24)] bg-[linear-gradient(135deg,#f7bf59_0%,#ffd77d_100%)] px-6 py-3 text-sm font-semibold text-[#22160a] shadow-[0_18px_34px_rgba(247,191,89,0.24)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_40px_rgba(247,191,89,0.3)] active:scale-95",
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
            className={`flex-1 ${storefrontSecondaryButtonClass}`}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 ${variantClasses[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      <p className="text-sm font-semibold leading-7 text-white/75">{message}</p>
    </Modal>
  );
});

export default Modal;
