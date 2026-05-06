"use client";

import { useEffect, useState } from "react";
import SeriesPage from "../../../components/series/SeriesPage";

export default function SeriesRouteClientShell({
  fallback = null,
  seriesId,
  initialSeriesPayload = null,
  initialSeriesState = "unavailable",
  initialGateStatus = "OK",
  initialSearchParams = null,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return fallback;
  }

  return (
    <SeriesPage
      seriesId={seriesId}
      initialSeriesPayload={initialSeriesPayload}
      initialSeriesState={initialSeriesState}
      initialGateStatus={initialGateStatus}
      initialSearchParams={initialSearchParams}
    />
  );
}
