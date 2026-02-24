"use client";

import { useEffect, useState } from "react";

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function useCountdown(readyAtMs) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!readyAtMs) {
      return undefined;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [readyAtMs]);

  if (!readyAtMs) {
    return { remainingMs: null, isReady: true, formatted: null };
  }

  const remainingMs = readyAtMs - now;
  const isReady = remainingMs <= 0;
  const formatted = isReady ? null : formatCountdown(remainingMs);

  return { remainingMs, isReady, formatted };
}
