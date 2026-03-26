import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import NetworkFallback from "./NetworkFallback";

export function useBackendReady() {
  const [ready, setReady] = useState(true);
  const [checked, setChecked] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    setChecked(false);

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
  }, [attempt]);

  const retry = useCallback(() => {
    setAttempt((previous) => previous + 1);
  }, []);

  return { ready, checked, retry };
}

export function ApiBootGuard({ children }) {
  const { ready, checked, retry } = useBackendReady();

  const shouldBlock = checked && !ready;

  return (
    <>
      {shouldBlock ? (
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <NetworkFallback
            compact
            onRetry={retry}
            title="Oops! Our servers are taking a quick breather."
            description="We're having trouble connecting. Your data is safe, and saved browsing can still work while live account features catch up."
          />
        </div>
      ) : null}
      {children}
    </>
  );
}
