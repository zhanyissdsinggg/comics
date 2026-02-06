"use client";

import { createContext, useContext, useState, useCallback } from "react";

/**
 * 老王说：Toast上下文，管理全局Toast消息
 * 这个SB上下文用于替代那些憨批的window.alert
 */
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  /**
   * 老王说：显示Toast消息
   * @param {string} message 消息内容
   * @param {string} type 消息类型：success、error、warning、info
   * @param {number} duration 持续时间（毫秒），0表示不自动关闭
   */
  const showToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  /**
   * 老王说：移除Toast消息
   */
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * 老王说：快捷方法
   */
  const success = useCallback((message, duration) => showToast(message, "success", duration), [showToast]);
  const error = useCallback((message, duration) => showToast(message, "error", duration), [showToast]);
  const warning = useCallback((message, duration) => showToast(message, "warning", duration), [showToast]);
  const info = useCallback((message, duration) => showToast(message, "info", duration), [showToast]);

  const value = {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/**
 * 老王说：使用Toast的Hook
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast必须在ToastProvider内部使用");
  }
  return context;
}
