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
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full border-[3px] border-black bg-white px-4 py-2.5 text-sm shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:border-[color:var(--gush-border)] dark:bg-[rgba(18,24,34,0.92)]">
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-black ${
            online
              ? "bg-[#d9fff0] text-black dark:border-[rgba(77,212,176,0.18)] dark:bg-[rgba(77,212,176,0.12)]"
              : "bg-[#fff6cf] text-black dark:border-[rgba(242,184,75,0.22)] dark:bg-[rgba(242,184,75,0.12)]"
          }`}
        >
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
            Connection
          </p>
          <p className="mt-0.5 text-sm font-medium leading-5 text-black dark:text-[var(--gush-ink-strong)]">
            {online
              ? "Back online."
              : "Offline. Some saved pages may still open."}
          </p>
        </div>
      </div>
    </div>
  );
}
