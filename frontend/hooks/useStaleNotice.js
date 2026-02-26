import { useEffect, useState } from "react";

export function useStaleNotice(response) {
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (response?.stale) {
      setIsStale(true);
      return;
    }
    setIsStale(false);
  }, [response?.stale]);

  return isStale;
}
