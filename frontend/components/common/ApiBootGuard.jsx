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
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold text-amber-900">Some live account features are temporarily unavailable.</p>
        <p className="mt-1 text-amber-800/90">
          Browsing can still work with saved data, but sign-in, checkout, or account updates may not respond right away.
          {countdown > 0 ? ` Trying again in ${countdown}s.` : ""}
        </p>
      </div>
    );
  }, [shouldBlock, countdown]);

  return (
    <>
      {shouldBlock && content ? (
        <div className="flex items-center gap-2 px-4 py-2">
          {content}
          <button
            type="button"
            onClick={() => router.refresh()}
            className="whitespace-nowrap rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 transition hover:border-amber-400 hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      ) : null}
      {children}
    </>
  );
}
