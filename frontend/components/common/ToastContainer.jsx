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
      panel: "border-black/10 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.14)]",
      iconWrap:
        "border-black/10 bg-emerald-50 text-black",
      icon: <CheckCircle2 size={18} />,
    },
    error: {
      panel: "border-rose-200/70 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] shadow-[0_20px_40px_rgba(244,63,94,0.12)]",
      iconWrap:
        "border-rose-200/70 bg-white text-rose-700",
      icon: <AlertCircle size={18} />,
    },
    warning: {
      panel: "border-amber-200/70 bg-[linear-gradient(180deg,#fffdf7_0%,#fff8eb_100%)] shadow-[0_20px_40px_rgba(245,158,11,0.12)]",
      iconWrap:
        "border-amber-200/70 bg-white text-black",
      icon: <TriangleAlert size={18} />,
    },
    info: {
      panel: "border-black/10 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.14)]",
      iconWrap:
        "border-sky-200/70 bg-sky-50 text-black",
      icon: <Info size={18} />,
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div
      role="status"
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`${style.panel} animate-in slide-in-from-right-3 fade-in-0 flex items-start gap-3 rounded-[24px] border px-4 py-3.5 text-black duration-300`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border ${style.iconWrap}`}
      >
        {style.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/68">
          {resolvedLabel}
        </p>
        <p className="mt-1 text-sm font-bold leading-6 text-black">
          {resolvedMessage}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black/60 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-black/[0.03] hover:text-black hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)] active:translate-y-px"
        aria-label={isAdminUi ? "关闭" : "Close"}
      >
        <X size={16} />
      </button>
    </div>
  );
}
