import { useEffect, useState } from "react";
import { subscribeToast } from "../../lib/toastBus";

const DEFAULT_DURATION = 4000;

export default function GlobalErrorToast() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    return subscribeToast((payload) => {
      if (!payload?.message) {
        return;
      }
      setMessage(payload.message);
      const duration = payload.durationMs || DEFAULT_DURATION;
      if (duration > 0) {
        setTimeout(() => {
          setMessage((prev) => (prev === payload.message ? "" : prev));
        }, duration);
      }
    });
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
      {message}
    </div>
  );
}
