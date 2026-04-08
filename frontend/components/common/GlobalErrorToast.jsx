import { AlertCircle } from "lucide-react";
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
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center sm:bottom-6">
      <div
        role="alert"
        aria-live="assertive"
        className="pointer-events-auto flex w-full max-w-xl items-start gap-3 rounded-[22px] border border-[rgba(180,35,24,0.14)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(250,244,240,0.96))] px-4 py-3 text-[var(--gush-ink)] shadow-[var(--gush-shadow-floating)] backdrop-blur-xl dark:border-[rgba(255,137,124,0.22)] dark:bg-[linear-gradient(180deg,rgba(29,24,23,0.96),rgba(23,19,18,0.94))]"
      >
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-[rgba(180,35,24,0.12)] bg-[rgba(180,35,24,0.08)] text-[var(--gush-danger)] dark:border-[rgba(255,137,124,0.18)] dark:bg-[rgba(255,137,124,0.1)]">
          <AlertCircle size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--gush-danger)]">
            Notice
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-[var(--gush-ink-strong)] dark:text-[var(--gush-ink-strong)]">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
