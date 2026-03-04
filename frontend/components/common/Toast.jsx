"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    icon: "text-emerald-400",
    text: "text-emerald-300",
  },
  error: {
    bg: "bg-red-500/10 border-red-500/20",
    icon: "text-red-400",
    text: "text-red-300",
  },
  warning: {
    bg: "bg-yellow-500/10 border-yellow-500/20",
    icon: "text-yellow-400",
    text: "text-yellow-300",
  },
  info: {
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: "text-blue-400",
    text: "text-blue-300",
  },
};

export const Toast = memo(function Toast({
  type = "info",
  message,
  description,
  duration = 3000,
  onClose,
  position = "top",
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const Icon = iconMap[type];
  const colors = colorMap[type];

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, 50);

    if (duration > 0) {
      const closeTimer = setTimeout(handleClose, duration);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(closeTimer);
      };
    }

    return () => clearTimeout(showTimer);
  }, [duration, handleClose]);

  if (!isVisible) {
    return null;
  }

  const positionClasses = {
    top: "top-4",
    bottom: "bottom-4",
  };

  return (
    <div
      className={`fixed left-1/2 z-[9999] w-full max-w-sm -translate-x-1/2 px-4 transition-all duration-300 ${
        positionClasses[position]
      } ${
        isAnimating
          ? "translate-y-0 opacity-100"
          : position === "top"
            ? "-translate-y-4 opacity-0"
            : "translate-y-4 opacity-0"
      }`}
    >
      <div
        className={`rounded-2xl border backdrop-blur-xl p-4 shadow-2xl ${colors.bg}`}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${colors.icon}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${colors.text}`}>{message}</p>
            {description ? (
              <p className="mt-1 text-xs text-neutral-400">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex-shrink-0 rounded-full p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});

export const ToastContainer = memo(function ToastContainer({ toasts = [], onRemove }) {
  return (
    <>
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id || index}
          {...toast}
          onClose={() => onRemove?.(toast.id || index)}
        />
      ))}
    </>
  );
});

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    showToast,
    removeToast,
    success: (message, description) => showToast({ type: "success", message, description }),
    error: (message, description) => showToast({ type: "error", message, description }),
    warning: (message, description) => showToast({ type: "warning", message, description }),
    info: (message, description) => showToast({ type: "info", message, description }),
  };
}

export default Toast;
