"use client";

import { useEffect } from "react";

export default function RewardToast({ message, onClose }) {
  useEffect(() => {
    if (!message) {
      return undefined;
    }
    const timer = setTimeout(() => onClose?.(), 2200);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-3.5 text-sm text-slate-700 shadow-[0_20px_48px_rgba(15,23,42,0.14)]"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        Rewards
      </p>
      <p className="mt-1 font-medium text-slate-950">{message}</p>
    </div>
  );
}
