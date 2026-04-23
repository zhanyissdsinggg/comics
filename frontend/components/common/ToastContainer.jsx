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

  const styles = {
    success: {
      panel:
        "border-black bg-white dark:border-[rgba(77,212,176,0.18)] dark:bg-[linear-gradient(180deg,rgba(18,27,29,0.96),rgba(15,23,25,0.94))]",
      iconWrap:
        "border-black bg-[#d9fff0] text-black dark:border-[rgba(77,212,176,0.18)] dark:bg-[rgba(77,212,176,0.12)]",
      icon: <CheckCircle2 size={18} />,
    },
    error: {
      panel:
        "border-black bg-[#ffe7ec] dark:border-[rgba(255,137,124,0.2)] dark:bg-[linear-gradient(180deg,rgba(29,24,23,0.96),rgba(23,19,18,0.94))]",
      iconWrap:
        "border-black bg-[#ff007a]/10 text-[#ff007a] dark:border-[rgba(255,137,124,0.18)] dark:bg-[rgba(255,137,124,0.12)]",
      icon: <AlertCircle size={18} />,
    },
    warning: {
      panel:
        "border-black bg-[#fff6cf] dark:border-[rgba(242,184,75,0.22)] dark:bg-[linear-gradient(180deg,rgba(31,27,21,0.96),rgba(24,21,17,0.94))]",
      iconWrap:
        "border-black bg-[#ffe500] text-black dark:border-[rgba(242,184,75,0.2)] dark:bg-[rgba(242,184,75,0.12)]",
      icon: <TriangleAlert size={18} />,
    },
    info: {
      panel:
        "border-black bg-white dark:border-[color:var(--gush-border-strong)] dark:bg-[linear-gradient(180deg,rgba(20,27,37,0.96),rgba(17,24,33,0.94))]",
      iconWrap:
        "border-black bg-[#dffcff] text-black dark:border-[rgba(255,255,255,0.12)] dark:bg-white/[0.08]",
      icon: <Info size={18} />,
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div
      role="status"
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`${style.panel} animate-in slide-in-from-right-3 fade-in-0 flex items-start gap-3 rounded-[24px] border-[3px] px-4 py-3.5 text-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] duration-300`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border-[3px] ${style.iconWrap}`}
      >
        {style.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/45">
          {resolvedLabel}
        </p>
        <p className="mt-1 text-sm font-medium leading-6 text-black dark:text-[var(--gush-ink-strong)]">
          {resolvedMessage}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-black text-black/45 transition hover:-translate-y-0.5 hover:bg-[#ffe7ec] hover:text-black dark:hover:bg-white/5"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}
