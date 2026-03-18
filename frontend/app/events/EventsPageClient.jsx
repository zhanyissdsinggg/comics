"use client";

import { useEffect, useMemo, useState } from "react";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import SiteHeader from "../../components/layout/SiteHeader";
import { clearEventBuffer, getEventBuffer, subscribeEvents } from "../../lib/eventBus";
import { apiDelete, apiGet, getApiBaseUrl } from "../../lib/apiClient";
import { formatUSTime } from "../../lib/localization";
import { useAuthStore } from "../../store/useAuthStore";

const PAGE_SIZE = 30;

function buildServerQuery(eventFilter, page) {
  const params = new URLSearchParams();
  if (eventFilter) {
    params.set("event", eventFilter);
  }
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String((page - 1) * PAGE_SIZE));
  return params.toString() ? `?${params.toString()}` : "";
}

function isErrorEvent(item) {
  const label = String(item?.event || "").toLowerCase();
  return label.includes("error") || label.includes("fail");
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export default function EventsPage() {
  const { hydrated: authHydrated, isSignedIn } = useAuthStore();
  const [events, setEvents] = useState(() => getEventBuffer());
  const [query, setQuery] = useState("");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [source, setSource] = useState("local");
  const [eventFilter, setEventFilter] = useState("");
  const [page, setPage] = useState(1);
  const [serverTotal, setServerTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [windowMinutes, setWindowMinutes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Watching local in-memory events.");
  const [errorMessage, setErrorMessage] = useState("");
  const [clearing, setClearing] = useState(false);
  const [exportingServer, setExportingServer] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (source !== "local") {
      return undefined;
    }

    setLoading(false);
    setErrorMessage("");
    setServerTotal(0);
    setCounts({});
    setStatusMessage("Watching local in-memory events.");

    const syncLocalEvents = () => {
      setEvents(getEventBuffer());
    };

    syncLocalEvents();
    return subscribeEvents(syncLocalEvents);
  }, [source]);

  useEffect(() => {
    if (source !== "server") {
      return undefined;
    }

    if (!authHydrated) {
      setLoading(true);
      setErrorMessage("");
      setStatusMessage("Checking account session before loading the server log...");
      setEvents([]);
      setServerTotal(0);
      setCounts({});
      return undefined;
    }

    if (!isSignedIn) {
      setLoading(false);
      setErrorMessage("");
      setStatusMessage("Sign in to load the server event log.");
      setEvents([]);
      setServerTotal(0);
      setCounts({});
      return undefined;
    }

    let active = true;
    const queryString = buildServerQuery(eventFilter, page);

    setLoading(true);
    setErrorMessage("");
    setStatusMessage("Loading server event log...");
    setEvents([]);
    setServerTotal(0);
    setCounts({});

    apiGet(`/api/events${queryString}`, { cacheMs: 0, bust: true })
      .then((response) => {
        if (!active) {
          return;
        }

        if (response.ok) {
          const nextEvents = response.data?.events || [];
          setEvents(nextEvents);
          setServerTotal(response.data?.total || 0);
          setCounts(response.data?.counts || {});
          setStatusMessage(
            nextEvents.length > 0
              ? "Loaded the current server event page."
              : "No server events matched the current filter.",
          );
          return;
        }

        setErrorMessage(response.error || "Failed to load server events.");
        setStatusMessage("Server event log could not be loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setErrorMessage("Failed to load server events.");
        setStatusMessage("Server event log could not be loaded.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authHydrated, eventFilter, isSignedIn, page, reloadToken, source]);

  const localView = useMemo(() => {
    if (source !== "local") {
      return [];
    }

    const now = Date.now();
    const windowMs = windowMinutes > 0 ? windowMinutes * 60 * 1000 : 0;
    let filtered = events;

    if (windowMs > 0) {
      filtered = filtered.filter((item) => now - item.ts <= windowMs);
    }

    if (query) {
      const normalizedQuery = query.toLowerCase();
      filtered = filtered.filter((item) =>
        String(item.event || "").toLowerCase().includes(normalizedQuery),
      );
    }

    if (onlyErrors) {
      filtered = filtered.filter(isErrorEvent);
    }

    return filtered.slice(0, PAGE_SIZE);
  }, [events, onlyErrors, query, source, windowMinutes]);

  const list = source === "server" ? events : localView;
  const errorSummary = useMemo(() => list.filter(isErrorEvent).slice(0, 5), [list]);
  const totalVisibleErrors = useMemo(() => list.filter(isErrorEvent).length, [list]);

  const windowLabel =
    windowMinutes === 0
      ? "All time"
      : windowMinutes === 5
        ? "Last 5m"
        : windowMinutes === 60
          ? "Last 1h"
          : "Last 24h";

  const totalPages = Math.max(1, Math.ceil(serverTotal / PAGE_SIZE));
  const serverUnavailable = source === "server" && (!authHydrated || !isSignedIn);

  const handleSourceChange = (nextSource) => {
    setSource(nextSource);
    setPage(1);
    setErrorMessage("");

    if (nextSource === "server") {
      setQuery("");
      setOnlyErrors(false);
      setWindowMinutes(0);
      setStatusMessage(
        authHydrated && !isSignedIn
          ? "Sign in to load the server event log."
          : "Switching to server event log...",
      );
      return;
    }

    setEventFilter("");
    setStatusMessage("Watching local in-memory events.");
  };

  const handleLocalReload = () => {
    setEvents(getEventBuffer());
    setErrorMessage("");
    setStatusMessage("Reloaded the local event buffer.");
  };

  const handleLocalClear = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Clear the local in-memory event buffer?");
      if (!confirmed) {
        return;
      }
    }

    clearEventBuffer();
    setEvents(getEventBuffer());
    setErrorMessage("");
    setStatusMessage("Cleared the local event buffer.");
  };

  const handleServerRefresh = () => {
    if (serverUnavailable) {
      return;
    }
    setReloadToken((prev) => prev + 1);
  };

  const handleServerClear = async () => {
    if (serverUnavailable) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Clear all server-side events for this account?");
      if (!confirmed) {
        return;
      }
    }

    setClearing(true);
    setErrorMessage("");

    try {
      const response = await apiDelete("/api/events");
      if (!response.ok) {
        setErrorMessage(response.error || "Failed to clear server events.");
        setStatusMessage("Server event log could not be cleared.");
        return;
      }

      setEvents([]);
      setServerTotal(0);
      setCounts({});
      setPage(1);
      setStatusMessage("Cleared the server event log.");
    } catch {
      setErrorMessage("Failed to clear server events.");
      setStatusMessage("Server event log could not be cleared.");
    } finally {
      setClearing(false);
    }
  };

  const handleServerExport = async () => {
    if (serverUnavailable) {
      return;
    }

    setExportingServer(true);
    setErrorMessage("");

    try {
      const queryString = eventFilter
        ? `?${new URLSearchParams({ event: eventFilter }).toString()}`
        : "";
      const response = await fetch(`${getApiBaseUrl()}/api/events/export${queryString}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const message = (await response.text()).trim();
        throw new Error(message || `Export failed with status ${response.status}.`);
      }

      const blob = await response.blob();
      downloadBlob(blob, "event-log-server.json");
      setStatusMessage("Exported the server event log.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to export server events.");
      setStatusMessage("Server event export failed.");
    } finally {
      setExportingServer(false);
    }
  };

  const handleCurrentViewExport = () => {
    const blob = new Blob([JSON.stringify(list, null, 2)], {
      type: "application/json",
    });

    downloadBlob(
      blob,
      source === "server" ? "event-log-current-page.json" : "event-log-local-view.json",
    );
    setStatusMessage("Exported the current event view.");
  };

  const fieldLabelClass = "font-semibold uppercase tracking-[0.22em] text-slate-500";
  const fieldClass =
    "w-full rounded-full border border-black/8 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[rgba(47,107,255,0.35)] focus:ring-2 focus:ring-[rgba(47,107,255,0.12)] disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-60";
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
  const destructiveButtonClass =
    "rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <main className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <div className="relative mx-auto max-w-[1280px] space-y-8 px-4 py-8 pb-14 sm:px-6 sm:py-10 lg:px-8">
        <EditorialHero
          appearance="light"
          accent="blue"
          eyebrow="Observability"
          title="Inspect local events and the signed-in server log without mixing the two."
          description="This page keeps the local event buffer separate from account-level server history, so refresh, export, and clear actions stay predictable."
          secondary="Use local mode for quick frontend checks. Switch to server mode when you need account-scoped history, counts, and export."
          stats={[
            {
              label: "Source",
              value: source === "server" ? "Server" : "Local",
              hint: source === "server"
                ? "Server mode reads the signed-in event log with backend pagination."
                : "Local mode watches the in-memory frontend event buffer.",
            },
            {
              label: "Visible",
              value: String(list.length),
              hint: source === "server"
                ? `${serverTotal} total records match the current server filter.`
                : "Local mode shows the current filtered buffer view.",
            },
            {
              label: "Errors",
              value: String(totalVisibleErrors),
              hint: "Entries in the current view that look like errors or failures.",
            },
            {
              label: "Scope",
              value: source === "server" ? "Account log" : windowLabel,
              hint: source === "server"
                ? "Server mode uses exact event-name filtering and page navigation."
                : "Local mode supports time windows and client-side error filtering.",
            },
          ]}
        />

        <section className="grid gap-4 lg:grid-cols-[1.06fr_0.94fr]">
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Controls
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Pick a source, narrow the list, and run explicit actions.
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-xs text-slate-500">
                <span className={fieldLabelClass}>Source</span>
                <select
                  value={source}
                  onChange={(event) => handleSourceChange(event.target.value)}
                  className={fieldClass}
                >
                  <option value="local">Local</option>
                  <option value="server">Server</option>
                </select>
              </label>

              {source === "server" ? (
                <label className="space-y-2 text-xs text-slate-500">
                  <span className={fieldLabelClass}>Server event name</span>
                  <input
                    value={eventFilter}
                    onChange={(event) => {
                      setEventFilter(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Exact event name"
                    disabled={serverUnavailable}
                    className={fieldClass}
                  />
                </label>
              ) : (
                <label className="space-y-2 text-xs text-slate-500">
                  <span className={fieldLabelClass}>Search</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Filter local event names"
                    className={fieldClass}
                  />
                </label>
              )}
            </div>

            {source === "local" ? (
              <div className="grid gap-3 sm:grid-cols-[0.72fr_0.28fr]">
                <label className="space-y-2 text-xs text-slate-500">
                  <span className={fieldLabelClass}>Time window</span>
                  <select
                    value={String(windowMinutes)}
                    onChange={(event) => setWindowMinutes(Number(event.target.value || 0))}
                    className={fieldClass}
                  >
                    <option value="0">All time</option>
                    <option value="5">Last 5m</option>
                    <option value="60">Last 1h</option>
                    <option value="1440">Last 24h</option>
                  </select>
                </label>

                <label className="flex items-center gap-3 rounded-[24px] border border-black/8 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={onlyErrors}
                    onChange={(event) => setOnlyErrors(event.target.checked)}
                  />
                  Only errors
                </label>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {source === "server" ? (
                <>
                  <button
                    type="button"
                    onClick={handleServerRefresh}
                    disabled={loading || serverUnavailable}
                    className={primaryButtonClass}
                  >
                    {loading ? "Refreshing..." : "Refresh server"}
                  </button>
                  <button
                    type="button"
                    onClick={handleServerClear}
                    disabled={clearing || serverUnavailable}
                    className={destructiveButtonClass}
                  >
                    {clearing ? "Clearing..." : "Clear server"}
                  </button>
                  <button
                    type="button"
                    onClick={handleServerExport}
                    disabled={exportingServer || serverUnavailable}
                    className={secondaryButtonClass}
                  >
                    {exportingServer ? "Exporting..." : "Export server"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleLocalReload}
                    className={secondaryButtonClass}
                  >
                    Reload local
                  </button>
                  <button
                    type="button"
                    onClick={handleLocalClear}
                    className={destructiveButtonClass}
                  >
                    Clear local
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleCurrentViewExport}
                disabled={list.length === 0}
                className={secondaryButtonClass}
              >
                Export current view
              </button>
            </div>

            <div className="rounded-[24px] border border-black/8 bg-[#f8f9fc] px-4 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-950">Status</p>
              <p className="mt-2">{statusMessage}</p>
              {source === "server" ? (
                <p className="mt-2 text-xs text-slate-500">
                  {serverUnavailable
                    ? "Sign in first, then switch or refresh to load the server log without triggering failed requests."
                    : "Server mode uses exact event-name filtering on the backend and supports export from the signed-in account log."}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Local mode reflects the in-memory frontend buffer. Reload reads the buffer again. Clear wipes it.
                </p>
              )}
            </div>
          </SurfacePanel>

          <div className="grid gap-4">
            {errorMessage ? (
              <SurfacePanel
                className="border-red-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.98),rgba(255,255,255,0.98))]"
                appearance="light"
                tone="danger"
                accent="rose"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-500">Error</p>
                <p className="mt-3 text-sm leading-7 text-red-600">{errorMessage}</p>
              </SurfacePanel>
            ) : null}

            {errorSummary.length > 0 ? (
              <SurfacePanel appearance="light" tone="danger" accent="rose">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-500">
                  Recent errors
                </p>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  {errorSummary.map((item, index) => (
                    <div key={`${item.event}-${item.ts}-${index}`}>
                      <p className="font-semibold text-slate-950">{item.event}</p>
                      <p className="text-xs text-red-500">{formatUSTime(item.ts)}</p>
                    </div>
                  ))}
                </div>
              </SurfacePanel>
            ) : null}

            {source === "server" && Object.keys(counts).length > 0 ? (
              <SurfacePanel appearance="light" accent="blue">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Server event counts
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-700">
                  {Object.entries(counts).map(([key, value]) => (
                    <span
                      key={key}
                      className="rounded-full border border-black/8 bg-white px-3 py-1"
                    >
                      {key}: {value}
                    </span>
                  ))}
                </div>
              </SurfacePanel>
            ) : null}
          </div>
        </section>

        <SurfacePanel appearance="light" accent="blue">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Event feed
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                {source === "server" ? "Current server page" : "Current local view"}
              </h2>
            </div>
            {source === "server" && serverTotal > PAGE_SIZE && !serverUnavailable ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={loading || page <= 1}
                  className="rounded-full border border-black/8 bg-white px-3 py-1 transition hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <span>
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={loading || page >= totalPages}
                  className="rounded-full border border-black/8 bg-white px-3 py-1 transition hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="mt-6 rounded-[24px] border border-black/8 bg-[#f8f9fc] px-5 py-8 text-sm text-slate-600">
              Loading events...
            </div>
          ) : list.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-black/8 bg-[#f8f9fc] px-5 py-8 text-sm text-slate-600">
              {source === "server"
                ? serverUnavailable
                  ? "Sign in to view the server event log."
                  : "No server events matched the current filter or page."
                : "No local events matched the current filters."}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {list.map((item, index) => (
                <details
                  key={`${item.event}-${item.ts}-${index}`}
                  className="rounded-[24px] border border-black/8 bg-white px-5 py-4 text-xs text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                >
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-950">{item.event}</span>
                    <span className="text-slate-500">{formatUSTime(item.ts)}</span>
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap text-[11px] leading-6 text-slate-500">
{JSON.stringify(item.props || {}, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </SurfacePanel>
      </div>
    </main>
  );
}
