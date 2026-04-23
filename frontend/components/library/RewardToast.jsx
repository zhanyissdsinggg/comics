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
      className="fixed bottom-6 right-6 z-50 max-w-sm border-[3px] border-black bg-[#ffe500] px-4 py-3.5 text-sm text-black shadow-[6px_6px_0_0_rgba(255,0,122,1)]"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/55">
        Rewards
      </p>
      <p className="mt-1 font-black uppercase tracking-[-0.02em] text-black">
        {message}
      </p>
    </div>
  );
}
