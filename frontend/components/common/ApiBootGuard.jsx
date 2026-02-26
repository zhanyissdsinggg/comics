import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "../../lib/apiClient";

export function useBackendReady() {
  const [ready, setReady] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiGet("/api/health", { cacheMs: 0, bust: true }).then((response) => {
      if (!mounted) {
        return;
      }
      setReady(Boolean(response.ok));
      setChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { ready, checked };
}

export function ApiBootGuard({ children }) {
  const router = useRouter();
  const { ready, checked } = useBackendReady();
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!checked || ready) {
      return;
    }
    setCountdown(3);
  }, [checked, ready]);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const shouldBlock = checked && !ready;
  const content = useMemo(() => {
    if (!shouldBlock) {
      return null;
    }
    return (
      <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-xs text-yellow-200">
        Backend is offline. Start it with `npm run start:dev` inside `backend`.
        {countdown > 0 ? ` Retrying in ${countdown}s...` : ""}
      </div>
    );
  }, [shouldBlock, countdown]);

  if (!shouldBlock) {
    return children;
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12 text-neutral-100">
      {content}
      <button
        type="button"
        onClick={() => router.refresh()}
        className="mt-4 rounded-full border border-yellow-500/60 px-4 py-2 text-xs text-yellow-200"
      >
        Retry now
      </button>
    </div>
  );
}
