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
    <div className="border-b border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-200">
      Backend is not reachable. Start `backend` with `npm run start:dev`.
    </div>
  );
}
