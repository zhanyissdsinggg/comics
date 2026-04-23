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
        className={`pointer-events-auto flex w-full items-start rounded-[24px] border-[3px] border-black text-black backdrop-blur-2xl dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(17,17,20,0.96))] ${
          isNetworkMessage
            ? "max-w-sm gap-2.5 bg-[#ffe7ec] px-3.5 py-3 shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
            : "max-w-md gap-3 bg-white px-4 py-3.5 shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
        }`}
      >
        <div
          className={`mt-0.5 flex flex-shrink-0 items-center justify-center border-[3px] border-black bg-[#ff007a]/10 text-[#ff007a] ${
            isNetworkMessage ? "h-8 w-8 rounded-full" : "h-9 w-9 rounded-2xl"
          }`}
        >
          <AlertCircle size={isNetworkMessage ? 16 : 18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff007a]">
            {label}
          </p>
          <p
            className={`mt-1 font-medium text-black ${
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
