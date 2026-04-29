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
      className="fixed bottom-6 right-6 z-50 max-w-sm rounded-[22px] border-2 border-black bg-[#0b0b0b] px-4 py-3.5 text-sm text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
        Points
      </p>
      <p className="mt-1 font-black uppercase tracking-[-0.02em] text-white">
        {message}
      </p>
    </div>
  );
}
