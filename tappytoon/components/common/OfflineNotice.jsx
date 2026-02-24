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
    <div className="border-b border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-200">
      {online ? "Back online." : "You are offline. Cached data may be shown."}
    </div>
  );
}
