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
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[24px] border border-black/10 bg-white px-4 py-2.5 text-sm shadow-[0_20px_40px_rgba(15,23,42,0.14)]">
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl border border-black/10 ${
            online
              ? "bg-emerald-50 text-black"
              : "bg-amber-50 text-black"
          }`}
        >
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
            Connection
          </p>
          <p className="mt-0.5 text-sm font-bold leading-5 text-black">
            {online
              ? "Back online."
              : "Offline. Some saved pages may still open."}
          </p>
        </div>
      </div>
    </div>
  );
}
