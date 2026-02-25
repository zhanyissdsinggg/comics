"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../../components/layout/SiteHeader";
import { clearEventBuffer, getEventBuffer, subscribeEvents } from "../../lib/eventBus";
import { apiDelete, apiGet, getApiBaseUrl } from "../../lib/apiClient";
import { formatUSTime } from "../../lib/localization";

export default function EventsPage() {
  const [events, setEvents] = useState(getEventBuffer());
  const [query, setQuery] = useState("");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [source, setSource] = useState("local");
  const [eventFilter, setEventFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const [serverTotal, setServerTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [windowMinutes, setWindowMinutes] = useState(0);

  useEffect(() => {
    if (source !== "local") {
      return undefined;
    }
    return subscribeEvents(() => {
      setEvents(getEventBuffer());
    });
  }, [source]);

  useEffect(() => {
    if (source !== "server") {
      setEvents(getEventBuffer());
      return;
    }
    let mounted = true;
    const params = new URLSearchParams();
    if (eventFilter) {
      params.set("event", eventFilter);
    }
    params.set("limit", String(pageSize));
    params.set("offset", String((page - 1) * pageSize));
    const queryString = params.toString() ? `?${params.toString()}` : "";
    apiGet(`/api/events${queryString}`, { cacheMs: 0, bust: true }).then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok) {
        setEvents(response.data?.events || []);
        setServerTotal(response.data?.total || 0);
        setCounts(response.data?.counts || {});
      }
    });
    return () => {
      mounted = false;
    };
  }, [source, eventFilter, page]);

  const list = useMemo(() => {
    const now = Date.now();
    const windowMs = windowMinutes > 0 ? windowMinutes * 60 * 1000 : 0;
    let filtered = events;
    if (windowMs > 0) {
      filtered = filtered.filter((item) => now - item.ts <= windowMs);
    }
    if (query) {
      filtered = filtered.filter((item) =>
        String(item.event || "").toLowerCase().includes(query.toLowerCase())
      );
    }
    if (onlyErrors) {
      filtered = filtered.filter((item) => String(item.event || "").includes("error"));
    }
    return filtered.slice(0, 30);
  }, [events, query, onlyErrors, windowMinutes]);

  const errorSummary = useMemo(() => {
    const now = Date.now();
    const windowMs = windowMinutes > 0 ? windowMinutes * 60 * 1000 : 0;
    return events
      .filter((item) => {
        if (windowMs > 0 && now - item.ts > windowMs) {
          return false;
        }
        return String(item.event || "").includes("error");
      })
      .slice(0, 5);
  }, [events, windowMinutes]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Event Log</h1>
          <p className="mt-2 text-sm text-neutral-400">Recent client events & errors.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by event name..."
            className="w-full rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs sm:w-64"
          />
          {source === "server" ? (
            <input
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
              placeholder="Server event filter..."
              className="w-full rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs sm:w-64"
            />
          ) : null}
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs"
          >
            <option value="local">Local</option>
            <option value="server">Server</option>
          </select>
          <select
            value={String(windowMinutes)}
            onChange={(event) => setWindowMinutes(Number(event.target.value || 0))}
            className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs"
          >
            <option value="0">All time</option>
            <option value="5">Last 5m</option>
            <option value="60">Last 1h</option>
            <option value="1440">Last 24h</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={onlyErrors}
              onChange={(event) => setOnlyErrors(event.target.checked)}
            />
            Only errors
          </label>
          <button
            type="button"
            onClick={() => {
              if (source === "server") {
                const params = new URLSearchParams();
                if (eventFilter) {
                  params.set("event", eventFilter);
                }
                params.set("limit", String(pageSize));
                params.set("offset", String((page - 1) * pageSize));
                const queryString = params.toString() ? `?${params.toString()}` : "";
                apiGet(`/api/events${queryString}`, { cacheMs: 0, bust: true }).then((response) => {
                  if (response.ok) {
                    setEvents(response.data?.events || []);
                    setServerTotal(response.data?.total || 0);
                    setCounts(response.data?.counts || {});
                  }
                });
                return;
              }
              clearEventBuffer();
              setEvents(getEventBuffer());
            }}
            className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
          >
            Refresh
          </button>
          {source === "server" ? (
            <button
              type="button"
              onClick={() => {
                apiDelete("/api/events").then(() => {
                  setEvents([]);
                });
              }}
              className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
            >
              Clear server
            </button>
          ) : null}
          {source === "server" ? (
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams();
                if (eventFilter) {
                  params.set("event", eventFilter);
                }
                const queryString = params.toString() ? `?${params.toString()}` : "";
                const url = `${getApiBaseUrl()}/api/events/export${queryString}`;
                fetch(url, { credentials: "include" })
                  .then((response) => response.blob())
                  .then((blob) => {
                    const link = document.createElement("a");
                    const objectUrl = URL.createObjectURL(blob);
                    link.href = objectUrl;
                    link.download = "event-log-server.json";
                    link.click();
                    URL.revokeObjectURL(objectUrl);
                  });
              }}
              className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
            >
              Export server
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify(events, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "event-log.json";
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
          >
            Export JSON
          </button>
          {source === "server" ? (
            <span className="text-[10px] text-neutral-500">Requires sign-in</span>
          ) : null}
        </div>
        {source === "server" && serverTotal > pageSize ? (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-full border border-neutral-800 px-3 py-1 disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {page} / {Math.max(1, Math.ceil(serverTotal / pageSize))}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((prev) =>
                  Math.min(Math.ceil(serverTotal / pageSize), prev + 1)
                )
              }
              disabled={page >= Math.ceil(serverTotal / pageSize)}
              className="rounded-full border border-neutral-800 px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
        {errorSummary.length > 0 ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-200">
            <p className="text-[10px] text-red-300">Recent errors</p>
            <div className="mt-2 space-y-2">
              {errorSummary.map((item, index) => (
                <div key={`${item.event}-${item.ts}-${index}`}>
                  <span className="font-semibold">{item.event}</span>{" "}
                  <span className="text-red-200/80">
                    {formatUSTime(item.ts)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {source === "server" && Object.keys(counts).length > 0 ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-xs text-neutral-300">
            <p className="text-[10px] text-neutral-500">Event counts</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(counts).map(([key, value]) => (
                <span
                  key={key}
                  className="rounded-full border border-neutral-800 px-3 py-1"
                >
                  {key}: {value}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {list.length === 0 ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6 text-sm text-neutral-400">
            No events yet.
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((item, index) => (
              <details
                key={`${item.event}-${item.ts}-${index}`}
                className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-xs"
              >
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-neutral-100">{item.event}</span>
                  <span className="text-neutral-500">
                    {formatUSTime(item.ts)}
                  </span>
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-[10px] text-neutral-400">
{JSON.stringify(item.props || {}, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
