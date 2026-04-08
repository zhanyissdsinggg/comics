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
      <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-[20px] border border-[color:var(--gush-border)] bg-[rgba(255,251,245,0.94)] px-4 py-3 text-sm shadow-[var(--gush-shadow-soft)] backdrop-blur-xl dark:border-[color:var(--gush-border)] dark:bg-[rgba(18,24,34,0.92)]">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border ${
            online
              ? "border-[rgba(15,118,110,0.12)] bg-[rgba(15,118,110,0.08)] text-[var(--gush-success)] dark:border-[rgba(77,212,176,0.18)] dark:bg-[rgba(77,212,176,0.12)]"
              : "border-[rgba(161,98,7,0.14)] bg-[rgba(161,98,7,0.08)] text-[var(--gush-warning)] dark:border-[rgba(242,184,75,0.22)] dark:bg-[rgba(242,184,75,0.12)]"
          }`}
        >
          {online ? <Wifi size={17} /> : <WifiOff size={17} />}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gush-ink-faint)]">
            Connection
          </p>
          <p className="mt-0.5 text-sm font-medium leading-6 text-[var(--gush-ink-strong)] dark:text-[var(--gush-ink-strong)]">
            {online
              ? "Back online."
              : "Offline. Cached pages may still appear."}
          </p>
        </div>
      </div>
    </div>
  );
}
