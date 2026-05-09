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
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(28,23,36,0.96)_0%,rgba(17,13,24,0.98)_100%)] px-4 py-3 text-sm text-white shadow-[0_18px_42px_rgba(8,6,20,0.34)] backdrop-blur-xl">
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl border ${
            online
              ? "border-[rgba(103,232,249,0.2)] bg-[rgba(103,232,249,0.14)] text-[var(--gush-cyan)]"
              : "border-[rgba(244,201,93,0.22)] bg-[rgba(244,201,93,0.14)] text-[var(--gush-gold)]"
          }`}
        >
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
            Connection
          </p>
          <p className="mt-0.5 text-sm leading-5 text-white/86">
            {online
              ? "Back online."
              : "Offline for now. Saved pages can still open on this device."}
          </p>
        </div>
      </div>
    </div>
  );
}
