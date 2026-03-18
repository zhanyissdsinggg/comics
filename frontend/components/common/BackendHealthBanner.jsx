import { useEffect, useState } from "react";
import { checkBackendHealth } from "../../lib/healthCheck";

export default function BackendHealthBanner() {
  const [status, setStatus] = useState({ ok: true });

  useEffect(() => {
    let mounted = true;
    checkBackendHealth().then((next) => {
      if (!mounted) {
        return;
      }
      setStatus(next);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (status.ok) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
      Some live account and checkout features are temporarily unavailable.
    </div>
  );
}
