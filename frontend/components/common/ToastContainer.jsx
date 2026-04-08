"use client";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { useToast } from "./ToastContext";

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[9999] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
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

  const styles = {
    success: {
      label: "Saved",
      panel:
        "border-[rgba(15,118,110,0.14)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(246,250,248,0.96))] dark:border-[rgba(77,212,176,0.2)] dark:bg-[linear-gradient(180deg,rgba(18,27,29,0.96),rgba(15,23,25,0.94))]",
      iconWrap:
        "border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.08)] text-[var(--gush-success)] dark:border-[rgba(77,212,176,0.18)] dark:bg-[rgba(77,212,176,0.12)]",
      icon: <CheckCircle2 size={18} />,
    },
    error: {
      label: "Problem",
      panel:
        "border-[rgba(180,35,24,0.14)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(250,244,240,0.96))] dark:border-[rgba(255,137,124,0.2)] dark:bg-[linear-gradient(180deg,rgba(29,24,23,0.96),rgba(23,19,18,0.94))]",
      iconWrap:
        "border-[rgba(180,35,24,0.14)] bg-[rgba(180,35,24,0.08)] text-[var(--gush-danger)] dark:border-[rgba(255,137,124,0.18)] dark:bg-[rgba(255,137,124,0.12)]",
      icon: <AlertCircle size={18} />,
    },
    warning: {
      label: "Heads up",
      panel:
        "border-[rgba(161,98,7,0.14)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(251,247,239,0.96))] dark:border-[rgba(242,184,75,0.22)] dark:bg-[linear-gradient(180deg,rgba(31,27,21,0.96),rgba(24,21,17,0.94))]",
      iconWrap:
        "border-[rgba(161,98,7,0.14)] bg-[rgba(161,98,7,0.08)] text-[var(--gush-warning)] dark:border-[rgba(242,184,75,0.2)] dark:bg-[rgba(242,184,75,0.12)]",
      icon: <TriangleAlert size={18} />,
    },
    info: {
      label: "Update",
      panel:
        "border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(247,244,239,0.96))] dark:border-[color:var(--gush-border-strong)] dark:bg-[linear-gradient(180deg,rgba(20,27,37,0.96),rgba(17,24,33,0.94))]",
      iconWrap:
        "border-[rgba(134,98,69,0.14)] bg-[rgba(134,98,69,0.08)] text-[var(--gush-accent)] dark:border-[rgba(216,183,140,0.16)] dark:bg-[rgba(216,183,140,0.1)]",
      icon: <Info size={18} />,
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div
      role="status"
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`${style.panel} animate-in slide-in-from-right-3 fade-in-0 flex items-start gap-3 rounded-[22px] border px-4 py-3 text-[var(--gush-ink)] shadow-[var(--gush-shadow-floating)] duration-300`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border ${style.iconWrap}`}
      >
        {style.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--gush-ink-faint)]">
          {style.label}
        </p>
        <p className="mt-1 text-sm font-medium leading-6 text-[var(--gush-ink-strong)] dark:text-[var(--gush-ink-strong)]">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[var(--gush-ink-faint)] transition hover:bg-black/5 hover:text-[var(--gush-ink-strong)] dark:hover:bg-white/5"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}
