"use client";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { useToast } from "./ToastContext";
import {
  getToastLabel,
  normalizeToastMessage,
} from "../../lib/toastPresentation";
import { storefrontSecondaryButtonClass } from "./StorefrontPagePrimitives";

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[9999] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2.5">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  const { type, message } = toast;
  const resolvedMessage = normalizeToastMessage(message);
  const resolvedLabel = getToastLabel(type, message);
  const isAdminUi =
    typeof window !== "undefined" &&
    String(window.location?.pathname || "").startsWith("/admin");

  const styles = {
    success: {
      panel:
        "border border-white/12 bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(16,13,24,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.34)]",
      iconWrap:
        "border border-emerald-300/18 bg-emerald-300/12 text-emerald-100",
      icon: <CheckCircle2 size={18} />,
    },
    error: {
      panel:
        "border border-white/12 bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(16,13,24,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.34)]",
      iconWrap:
        "border border-[rgba(255,79,154,0.24)] bg-[rgba(255,79,154,0.14)] text-[var(--gush-danger)]",
      icon: <AlertCircle size={18} />,
    },
    warning: {
      panel:
        "border border-white/12 bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(16,13,24,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.34)]",
      iconWrap:
        "border border-[rgba(244,201,93,0.22)] bg-[rgba(244,201,93,0.14)] text-[var(--gush-gold)]",
      icon: <TriangleAlert size={18} />,
    },
    info: {
      panel:
        "border border-white/12 bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(16,13,24,0.98)_100%)] text-white shadow-[0_20px_48px_rgba(8,6,20,0.34)]",
      iconWrap:
        "border border-[rgba(103,232,249,0.22)] bg-[rgba(103,232,249,0.12)] text-[var(--gush-cyan)]",
      icon: <Info size={18} />,
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div
      role="status"
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`${style.panel} animate-in slide-in-from-right-3 fade-in-0 flex items-start gap-3 rounded-[24px] px-4 py-3.5 duration-300 backdrop-blur-xl`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl ${style.iconWrap}`}
      >
        {style.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">
          {resolvedLabel}
        </p>
        <p className="mt-1 text-sm leading-6 text-white/88">
          {resolvedMessage}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className={`${storefrontSecondaryButtonClass} h-9 w-9 flex-shrink-0 px-0 text-white/62 hover:text-white active:translate-y-px`}
        aria-label={isAdminUi ? "关闭" : "Close"}
      >
        <X size={16} />
      </button>
    </div>
  );
}
