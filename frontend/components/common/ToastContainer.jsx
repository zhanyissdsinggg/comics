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
import { storefrontPrimaryButtonClass } from "./StorefrontPagePrimitives";

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
        "border-2 border-black bg-[#0b0b0b] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
      iconWrap:
        "border-2 border-black bg-[#00E5FF] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
      icon: <CheckCircle2 size={18} />,
    },
    error: {
      panel:
        "border-2 border-black bg-[#0b0b0b] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
      iconWrap:
        "border-2 border-black bg-[#FF007A] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
      icon: <AlertCircle size={18} />,
    },
    warning: {
      panel:
        "border-2 border-black bg-[#0b0b0b] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
      iconWrap:
        "border-2 border-black bg-[#FFE500] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
      icon: <TriangleAlert size={18} />,
    },
    info: {
      panel:
        "border-2 border-black bg-[#0b0b0b] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
      iconWrap:
        "border-2 border-black bg-[#00E5FF] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
      icon: <Info size={18} />,
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div
      role="status"
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`${style.panel} animate-in slide-in-from-right-3 fade-in-0 flex items-start gap-3 rounded-[22px] border px-4 py-3.5 duration-300`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border ${style.iconWrap}`}
      >
        {style.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
          {resolvedLabel}
        </p>
        <p className="mt-1 text-sm font-bold leading-6 text-white">
          {resolvedMessage}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-black bg-[#FFE500] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 active:translate-y-px"
        aria-label={isAdminUi ? "关闭" : "Close"}
      >
        <X size={16} />
      </button>
    </div>
  );
}
