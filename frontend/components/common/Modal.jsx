"use client";

import { memo, useEffect, useState, useRef } from "react";
import { X } from "lucide-react";

/**
 * 老王注释：通用Modal弹窗组件 - iOS风格
 * 功能：显示模态对话框，支持多种尺寸和样式
 * 遵循KISS原则：简洁的弹窗实现
 * 遵循DRY原则：可复用的Modal组件
 */

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
  className = ""
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
    full: "max-w-full mx-4"
  };

  // 老王注释：焦点管理 - 打开时保存当前焦点，关闭时恢复
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      // 延迟聚焦，等待动画完成
      setTimeout(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          }
        }
      }, 100);
    } else {
      // 恢复之前的焦点
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // 老王注释：控制动画和body滚动
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

  // 老王注释：ESC键关闭
  useEffect(() => {
    if (!closeOnEsc || !isOpen) return;

    const handleEsc = (e) => {
      if (e.key === "Escape") {
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

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${
        isAnimating ? "bg-black/60 backdrop-blur-sm" : "bg-black/0"
      }`}
      onClick={handleOverlayClick}
      style={{ WebkitTapHighlightColor: "transparent" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* iOS风格弹窗 */}
      <div
        ref={modalRef}
        onClick={handleContentClick}
        className={`relative w-full ${sizeClasses[size]} bg-neutral-900/95 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 sm:rounded-3xl ${
          isAnimating
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-full sm:translate-y-0 opacity-0 sm:scale-95"
        } ${className}`}
        style={{
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem"
        }}
      >
        {/* 老王注释：移动端拖动指示器 */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-neutral-700" />
        </div>

        {/* 老王注释：头部 */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-white">{title}</h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={handleClose}
                className="ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full p-2 text-neutral-400 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* 老王注释：内容 */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* 老王注释：底部 */}
        {footer && (
          <div className="border-t border-white/5 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

// 确认对话框
export const ConfirmModal = memo(function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default"
}) {
  const variantClasses = {
    default: "bg-emerald-500 hover:bg-emerald-600",
    danger: "bg-red-500 hover:bg-red-600",
    warning: "bg-yellow-500 hover:bg-yellow-600"
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
            className="flex-1 rounded-full border border-neutral-700 px-6 py-3 text-sm font-medium text-neutral-200 transition-all duration-300 hover:border-neutral-600 hover:bg-white/5 active:scale-95"
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
      <p className="text-sm text-neutral-300">{message}</p>
    </Modal>
  );
});

export default Modal;
