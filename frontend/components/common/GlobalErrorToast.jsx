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
        className={`pointer-events-auto flex w-full items-start rounded-[24px] border-2 border-white/15 text-white ${
          isNetworkMessage
            ? "max-w-sm gap-2.5 bg-black px-3.5 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            : "max-w-md gap-3 bg-black px-4 py-3.5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
        }`}
      >
        <div
          className={`mt-0.5 flex flex-shrink-0 items-center justify-center rounded-2xl border-2 border-white/15 ${
            isNetworkMessage ? "bg-[#FFE500] text-black" : "bg-[#FF007A] text-white"
          } ${
            isNetworkMessage ? "h-8 w-8" : "h-9 w-9"
          }`}
        >
          <AlertCircle size={isNetworkMessage ? 16 : 18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">
            {label}
          </p>
          <p
            className={`mt-1 font-black text-white ${
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
