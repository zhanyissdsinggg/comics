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
      panel: "border-black bg-white",
      iconWrap:
        "border-black bg-[#d9fff0] text-black",
      icon: <CheckCircle2 size={18} />,
    },
    error: {
      panel: "border-black bg-[#ffe7ec]",
      iconWrap:
        "border-black bg-[#ff007a]/10 text-[#ff007a]",
      icon: <AlertCircle size={18} />,
    },
    warning: {
      panel: "border-black bg-[#fff6cf]",
      iconWrap:
        "border-black bg-[#ffe500] text-black",
      icon: <TriangleAlert size={18} />,
    },
    info: {
      panel: "border-black bg-white",
      iconWrap:
        "border-black bg-[#dffcff] text-black",
      icon: <Info size={18} />,
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div
      role="status"
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`${style.panel} animate-in slide-in-from-right-3 fade-in-0 flex items-start gap-3 border-[3px] px-4 py-3.5 text-black shadow-[8px_8px_0_0_rgba(255,0,122,1)] duration-300`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center border-[3px] ${style.iconWrap}`}
      >
        {style.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/45">
          {resolvedLabel}
        </p>
        <p className="mt-1 text-sm font-bold leading-6 text-black">
          {resolvedMessage}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center border-[3px] border-black bg-white text-black/60 transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe7ec] hover:text-black"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}
