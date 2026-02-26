"use client";

import { useEffect, useMemo, useState } from "react";

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function TtfClaim({ readyAt, eligible }) {
  const readyAtMs = useMemo(() => {
    if (!readyAt) {
      return null;
    }
    const parsed = Date.parse(readyAt);
    return Number.isNaN(parsed) ? null : parsed;
  }, [readyAt]);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!eligible) {
    return <span>TTF: Not eligible</span>;
  }

  if (!readyAtMs) {
    return <button type="button">Claim</button>;
  }

  const remaining = readyAtMs - now;
  if (remaining <= 0) {
    return <button type="button">Claim</button>;
  }

  return <span>TTF ready in {formatCountdown(remaining)}</span>;
}
