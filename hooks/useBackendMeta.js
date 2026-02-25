import { useEffect, useState } from "react";
import { apiGet } from "../lib/apiClient";

export function useBackendMeta() {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    let mounted = true;
    apiGet("/api/meta/version", { cacheMs: 10_000 }).then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok) {
        setMeta(response.data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return meta;
}
