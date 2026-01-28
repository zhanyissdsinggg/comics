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
    <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-neutral-800 bg-neutral-900/95 px-4 py-3 text-sm text-neutral-100 shadow-xl">
      {message}
    </div>
  );
}
