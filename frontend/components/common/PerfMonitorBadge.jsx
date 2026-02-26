import { useEffect, useState } from "react";

export default function PerfMonitorBadge() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return undefined;
    }
    const timer = setInterval(() => {
      if (typeof window === "undefined") {
        return;
      }
      const data = window.__perfMetrics || {};
      setMetrics({
        avgMs: data.readerImgAvgMs || 0,
        errors: data.readerImgErrors || 0,
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  if (process.env.NODE_ENV === "production" || !metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-2 left-2 z-40 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-[10px] text-neutral-400">
      img avg {metrics.avgMs}ms | err {metrics.errors}
    </div>
  );
}
