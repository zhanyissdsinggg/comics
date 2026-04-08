import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export default function OfflineNotice() {
  const online = useOnlineStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!online) {
      setShow(true);
      return;
    }
    const timer = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(timer);
  }, [online]);

  if (!show) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top,0px)+4.75rem)] z-40 flex justify-center sm:top-[calc(env(safe-area-inset-top,0px)+5rem)]">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full border border-[color:var(--gush-border)] bg-[rgba(255,255,255,0.92)] px-4 py-2.5 text-sm shadow-[0_16px_34px_rgba(0,0,0,0.08)] backdrop-blur-2xl dark:border-[color:var(--gush-border)] dark:bg-[rgba(18,24,34,0.92)]">
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${
            online
              ? "border-[rgba(15,118,110,0.12)] bg-[rgba(15,118,110,0.08)] text-[var(--gush-success)] dark:border-[rgba(77,212,176,0.18)] dark:bg-[rgba(77,212,176,0.12)]"
              : "border-[rgba(161,98,7,0.14)] bg-[rgba(161,98,7,0.08)] text-[var(--gush-warning)] dark:border-[rgba(242,184,75,0.22)] dark:bg-[rgba(242,184,75,0.12)]"
          }`}
        >
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gush-ink-faint)]">
            Connection
          </p>
          <p className="mt-0.5 text-sm font-medium leading-5 text-[var(--gush-ink-strong)] dark:text-[var(--gush-ink-strong)]">
            {online
              ? "Back online."
              : "Offline. Cached pages may still appear."}
          </p>
        </div>
      </div>
    </div>
  );
}
