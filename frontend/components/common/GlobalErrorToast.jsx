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
        className={`pointer-events-auto flex w-full items-start rounded-[24px] border border-black/10 text-black ${
          isNetworkMessage
            ? "max-w-sm gap-2.5 bg-[linear-gradient(180deg,#fffdf7_0%,#fff8eb_100%)] px-3.5 py-3 shadow-[0_20px_40px_rgba(245,158,11,0.12)]"
            : "max-w-md gap-3 bg-white px-4 py-3.5 shadow-[0_20px_40px_rgba(15,23,42,0.14)]"
        }`}
      >
        <div
          className={`mt-0.5 flex flex-shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-[#f6f7f9] text-black ${
            isNetworkMessage ? "h-8 w-8" : "h-9 w-9"
          }`}
        >
          <AlertCircle size={isNetworkMessage ? 16 : 18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black">
            {label}
          </p>
          <p
            className={`mt-1 font-black text-black ${
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
