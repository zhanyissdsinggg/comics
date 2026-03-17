"use client";

import { useEffect, useMemo, useState } from "react";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import StorefrontPathwaysGrid from "../../components/common/StorefrontPathwaysGrid";
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

  const errorSummary = useMemo(
    () => list.filter(isErrorEvent).slice(0, 5),
    [list],
  );

  const totalVisibleErrors = useMemo(
    () => list.filter(isErrorEvent).length,
    [list],
  );

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
  const eventConsoleCards = useMemo(
    () => [
      {
        id: "console-source",
        eyebrow: source === "server" ? "Server mode" : "Local mode",
        title:
          source === "server"
            ? "You are inspecting the signed-in backend event log."
            : "You are watching the in-memory frontend event buffer.",
        description:
          source === "server"
            ? "Server mode is best for account-scoped history, pagination, and backend export."
            : "Local mode is best for fast frontend debugging and quick client-side filtering.",
        ctaLabel: source === "server" ? "Switch to local" : "Switch to server",
        onClick: () => handleSourceChange(source === "server" ? "local" : "server"),
        accentClass:
          source === "server"
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15"
            : "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "console-errors",
        eyebrow: "Error lens",
        title:
          totalVisibleErrors > 0
            ? `${totalVisibleErrors} visible error event${totalVisibleErrors === 1 ? "" : "s"} deserve a closer look.`
            : "No obvious error events are visible in the current view.",
        description:
          source === "server"
            ? "Server logs help validate whether production-like failures are isolated or recurring across the account log."
            : "Local mode should make it easy to isolate failures without drowning in non-critical client events.",
        ctaLabel: source === "server" ? "Refresh server log" : "Show only errors",
        onClick: () => {
          if (source === "server") {
            handleServerRefresh();
            return;
          }
          setOnlyErrors(true);
        },
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "console-export",
        eyebrow: "Export",
        title: list.length > 0 ? "Export the current slice before you lose the trail." : "Exports matter most when a useful slice is on screen.",
        description:
          "A good event console should make it easy to hand off the exact current view for debugging, triage, or regression review.",
        ctaLabel: "Export current view",
        onClick: handleCurrentViewExport,
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "console-account",
        eyebrow: serverUnavailable ? "Account access" : "Next route",
        title: serverUnavailable
          ? "Sign in first if you want the backend event history."
          : "Keep the event console tied to the rest of the account system.",
        description: serverUnavailable
          ? "Server-side logs should stay scoped to a real signed-in account instead of failing in the background."
          : "Observability pages are strongest when they stay close to account state, support, and commerce follow-up.",
        ctaLabel: serverUnavailable ? "Open account" : "Open support",
        onClick: () => (serverUnavailable ? window.location.assign("/account") : window.location.assign("/support")),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
    ],
    [handleCurrentViewExport, list.length, serverUnavailable, source, totalVisibleErrors],
  );

  return (
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-8 px-4 py-8 pb-14 sm:px-6 sm:py-10 lg:px-8">
        <EditorialHero
          eyebrow="Observability"
          title="Inspect local event flow and the signed-in server log without mixing their behavior."
          description="The event console now separates local memory from server history, makes destructive actions explicit, and keeps export behavior aligned with what the user actually sees."
          secondary="Use local mode for quick frontend debugging. Switch to server mode when you need account-scoped history, counts, and export from the backend."
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
              hint: "Current view entries whose event names read like an error or failure.",
            },
            {
              label: "Scope",
              value: source === "server" ? "Account log" : windowLabel,
              hint: source === "server"
                ? "Server mode uses exact event-name filtering and page navigation."
                : "Local mode supports time-window and client-side error filtering.",
            },
          ]}
        />

        <SurfacePanel className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Console command deck
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Keep debugging actions obvious before the raw log.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                A premium observability surface is not just a giant table. It should tell you which source you are
                reading, what to export, and how to isolate failures quickly.
              </p>
            </div>
            <p className="text-sm text-neutral-500">
              {source === "server" ? "Signed-in server log mode" : "Frontend buffer mode"}
            </p>
          </div>
          <StorefrontPathwaysGrid cards={eventConsoleCards} />
        </SurfacePanel>

        <section className="grid gap-4 lg:grid-cols-[1.06fr_0.94fr]">
          <SurfacePanel className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Controls
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                Switch data source, narrow the view, and run explicit actions.
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-xs text-neutral-400">
                <span className="font-semibold uppercase tracking-[0.22em] text-neutral-500">Source</span>
                <select
                  value={source}
                  onChange={(event) => handleSourceChange(event.target.value)}
                  className="w-full rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-neutral-100"
                >
                  <option value="local">Local</option>
                  <option value="server">Server</option>
                </select>
              </label>

              {source === "server" ? (
                <label className="space-y-2 text-xs text-neutral-400">
                  <span className="font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    Server event name
                  </span>
                  <input
                    value={eventFilter}
                    onChange={(event) => {
                      setEventFilter(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Exact event name"
                    disabled={serverUnavailable}
                    className="w-full rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
              ) : (
                <label className="space-y-2 text-xs text-neutral-400">
                  <span className="font-semibold uppercase tracking-[0.22em] text-neutral-500">Search</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Filter local event names"
                    className="w-full rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-neutral-100"
                  />
                </label>
              )}
            </div>

            {source === "local" ? (
              <div className="grid gap-3 sm:grid-cols-[0.72fr_0.28fr]">
                <label className="space-y-2 text-xs text-neutral-400">
                  <span className="font-semibold uppercase tracking-[0.22em] text-neutral-500">Time window</span>
                  <select
                    value={String(windowMinutes)}
                    onChange={(event) => setWindowMinutes(Number(event.target.value || 0))}
                    className="w-full rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-neutral-100"
                  >
                    <option value="0">All time</option>
                    <option value="5">Last 5m</option>
                    <option value="60">Last 1h</option>
                    <option value="1440">Last 24h</option>
                  </select>
                </label>

                <label className="flex items-center gap-3 rounded-[24px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-neutral-200 backdrop-blur-sm">
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
                    className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-emerald-300 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Refreshing..." : "Refresh server"}
                  </button>
                  <button
                    type="button"
                    onClick={handleServerClear}
                    disabled={clearing || serverUnavailable}
                    className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {clearing ? "Clearing..." : "Clear server"}
                  </button>
                  <button
                    type="button"
                    onClick={handleServerExport}
                    disabled={exportingServer || serverUnavailable}
                    className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-emerald-300 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exportingServer ? "Exporting..." : "Export server"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleLocalReload}
                    className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-emerald-300 hover:text-emerald-200"
                  >
                    Reload local
                  </button>
                  <button
                    type="button"
                    onClick={handleLocalClear}
                    className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-red-300 hover:text-red-200"
                  >
                    Clear local
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleCurrentViewExport}
                disabled={list.length === 0}
                className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-emerald-300 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export current view
              </button>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-neutral-300 backdrop-blur-sm">
              <p className="font-semibold text-white">Status</p>
              <p className="mt-2">{statusMessage}</p>
              {source === "server" ? (
                <p className="mt-2 text-xs text-neutral-500">
                  {serverUnavailable
                    ? "Sign in first, then switch or refresh to load the server log without triggering failed requests."
                    : "Server mode uses exact event-name filtering on the backend and supports export from the signed-in account log."}
                </p>
              ) : (
                <p className="mt-2 text-xs text-neutral-500">
                  Local mode reflects the in-memory frontend buffer. Reload reads the buffer again; clear wipes it.
                </p>
              )}
            </div>
          </SurfacePanel>

          <div className="grid gap-4">
            {errorMessage ? (
              <SurfacePanel className="border-red-500/35 bg-[linear-gradient(135deg,rgba(127,29,29,0.45),rgba(255,255,255,0.02))]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-200/85">Error</p>
                <p className="mt-3 text-sm leading-7 text-red-100">{errorMessage}</p>
              </SurfacePanel>
            ) : null}

            {errorSummary.length > 0 ? (
              <SurfacePanel>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-200/85">
                  Recent errors
                </p>
                <div className="mt-4 space-y-3 text-sm text-neutral-300">
                  {errorSummary.map((item, index) => (
                    <div key={`${item.event}-${item.ts}-${index}`}>
                      <p className="font-semibold text-white">{item.event}</p>
                      <p className="text-xs text-red-200/80">{formatUSTime(item.ts)}</p>
                    </div>
                  ))}
                </div>
              </SurfacePanel>
            ) : null}

            {source === "server" && Object.keys(counts).length > 0 ? (
              <SurfacePanel>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                  Server event counts
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-300">
                  {Object.entries(counts).map(([key, value]) => (
                    <span
                      key={key}
                      className="rounded-full border border-white/12 px-3 py-1"
                    >
                      {key}: {value}
                    </span>
                  ))}
                </div>
              </SurfacePanel>
            ) : null}
          </div>
        </section>

        <SurfacePanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Event feed
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                {source === "server" ? "Current server page" : "Current local view"}
              </h2>
            </div>
            {source === "server" && serverTotal > PAGE_SIZE && !serverUnavailable ? (
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={loading || page <= 1}
                  className="rounded-full border border-white/12 px-3 py-1 transition hover:border-emerald-300 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="rounded-full border border-white/12 px-3 py-1 transition hover:border-emerald-300 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 px-5 py-8 text-sm text-neutral-300 backdrop-blur-sm">
              Loading events...
            </div>
          ) : list.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 px-5 py-8 text-sm text-neutral-300 backdrop-blur-sm">
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
                  className="rounded-[24px] border border-white/8 bg-black/20 px-5 py-4 text-xs text-neutral-300 backdrop-blur-sm"
                >
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-neutral-100">{item.event}</span>
                    <span className="text-neutral-500">{formatUSTime(item.ts)}</span>
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap text-[11px] leading-6 text-neutral-400">
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
