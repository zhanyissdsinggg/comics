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
        className={`relative w-full ${sizeClasses[size]} overflow-hidden rounded-[26px] border-2 border-black bg-[#0b0b0b] text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 sm:rounded-3xl ${
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
          <div className="h-1.5 w-12 rounded-full bg-white/15" />
        </div>

        {(title || showCloseButton) && (
          <div className="relative flex items-center justify-between border-b-2 border-black px-6 py-4">
            {title ? (
              <h2
                id="modal-title"
                className="font-display text-xl font-black uppercase tracking-[-0.05em] text-white"
              >
                {title}
              </h2>
            ) : null}
            {showCloseButton ? (
              <button
                type="button"
                onClick={handleClose}
                className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-black bg-[#FFE500] p-2 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            ) : null}
          </div>
        )}

        <div className="relative max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>

        {footer ? (
          <div className="relative border-t-2 border-black px-6 py-4">
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
      storefrontPrimaryButtonClass,
    danger:
      "inline-flex items-center justify-center rounded-full border-2 border-black bg-[#FF007A] px-6 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95",
    warning:
      "inline-flex items-center justify-center rounded-full border-2 border-black bg-[#FFE500] px-6 py-3 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95",
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
