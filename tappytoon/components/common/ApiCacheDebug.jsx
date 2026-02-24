"use client";

import { useEffect, useState } from "react";
import { getCacheLog, getCacheStats, resetCacheStats } from "../../lib/apiClient";

function shouldShowDebug() {
  if (typeof window === "undefined") {
    return false;
  }
  const stored = window.localStorage.getItem("mn_debug_cache") === "1";
  const params = new URLSearchParams(window.location.search);
  const query = params.get("debugCache") === "1";
  return stored || query;
}

export default function ApiCacheDebug() {
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState(getCacheStats());
  const [log, setLog] = useState(getCacheLog());
  const [perfStats, setPerfStats] = useState({});

  useEffect(() => {
    setEnabled(shouldShowDebug());
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const timer = setInterval(() => {
      setStats(getCacheStats());
      setLog(getCacheLog());
      if (typeof window !== "undefined") {
        const data = window.__perfMetrics || {};
        setPerfStats(data);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [enabled]);


  if (!enabled) {
    return null;
  }

  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? Math.round((stats.hits / total) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-64 rounded-2xl border border-neutral-800 bg-neutral-900/95 p-3 text-xs text-neutral-200 shadow-xl">
      <div className="text-[10px] uppercase text-neutral-500">API Cache</div>
      <div className="mt-1 space-y-1">
        <div>Hits: {stats.hits}</div>
        <div>Misses: {stats.misses}</div>
        <div>Hit rate: {hitRate}%</div>
        <div>Entries: {stats.size}</div>
        <div>Writes: {stats.writes}</div>
      </div>
      <div className="mt-2 max-h-28 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950/40 p-2 text-[10px] text-neutral-400">
        {log.slice(-6).map((entry) => (
          <div key={`${entry.type}-${entry.ts}`}>
            <span className="text-neutral-500">{entry.type}</span> {entry.path}
          </div>
        ))}
        {log.length === 0 ? <div>No events yet.</div> : null}
      </div>
      <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-950/40 p-2 text-[10px] text-neutral-400">
        <div className="text-[10px] uppercase text-neutral-500">Perf</div>
        <div className="mt-1 space-y-1">
          <div>Reader img avg: {perfStats.readerImgAvgMs ?? "--"} ms</div>
          <div>Reader img errors: {perfStats.readerImgErrors ?? 0}</div>
          <div>Rail preload: {perfStats.railPreloadCount ?? 0}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          resetCacheStats();
          setStats(getCacheStats());
          setLog(getCacheLog());
          if (typeof window !== "undefined") {
            window.__perfMetrics = {};
            setPerfStats({});
          }
        }}
        className="mt-2 rounded-full border border-neutral-700 px-2 py-1 text-[10px]"
      >
        Reset
      </button>
    </div>
  );
}
