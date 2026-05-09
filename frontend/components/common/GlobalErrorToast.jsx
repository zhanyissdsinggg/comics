import { AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { subscribeToast } from "../../lib/toastBus";
import {
  isNetworkToastMessage,
  getToastLabel,
  normalizeToastMessage,
} from "../../lib/toastPresentation";

const DEFAULT_DURATION = 4000;

export default function GlobalErrorToast() {
  const [message, setMessage] = useState("");
  const lastToastRef = useRef({ message: "", shownAt: 0 });

  useEffect(() => {
    return subscribeToast((payload) => {
      if (!payload?.message) {
        return;
      }
      const normalizedMessage = normalizeToastMessage(payload.message);
      const now = Date.now();

      if (
        normalizedMessage &&
        lastToastRef.current.message === normalizedMessage &&
        now - lastToastRef.current.shownAt < 8000
      ) {
        return;
      }

      lastToastRef.current = {
        message: normalizedMessage,
        shownAt: now,
      };
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

  const normalizedMessage = normalizeToastMessage(message);
  const isNetworkMessage = isNetworkToastMessage(message);
  const label = getToastLabel("error", message);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--gush-mobile-bottom-nav-height)+0.85rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center md:bottom-6">
      <div
        role="alert"
        aria-live="assertive"
        className={`pointer-events-auto flex w-full items-start rounded-[24px] border border-white/12 text-white backdrop-blur-xl ${
          isNetworkMessage
            ? "max-w-sm gap-2.5 bg-[linear-gradient(180deg,rgba(29,24,37,0.97)_0%,rgba(16,13,24,0.98)_100%)] px-3.5 py-3 shadow-[0_20px_48px_rgba(8,6,20,0.34)]"
            : "max-w-md gap-3 bg-[linear-gradient(180deg,rgba(31,25,39,0.97)_0%,rgba(16,13,24,0.98)_100%)] px-4 py-3.5 shadow-[0_22px_54px_rgba(8,6,20,0.36)]"
        }`}
      >
        <div
          className={`mt-0.5 flex flex-shrink-0 items-center justify-center rounded-2xl border ${
            isNetworkMessage
              ? "border-[rgba(244,201,93,0.22)] bg-[rgba(244,201,93,0.14)] text-[var(--gush-gold)]"
              : "border-[rgba(255,79,154,0.24)] bg-[rgba(255,79,154,0.14)] text-[var(--gush-danger)]"
          } ${isNetworkMessage ? "h-8 w-8" : "h-9 w-9"}`}
        >
          <AlertCircle size={isNetworkMessage ? 16 : 18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">
            {label}
          </p>
          <p
            className={`mt-1 text-white/88 ${
              isNetworkMessage ? "text-[13px] leading-5" : "text-sm leading-6"
            }`}
          >
            {normalizedMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
