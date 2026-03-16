/**
 * 
 *  */

import { emitToast } from "./toastBus";
import { emitAuthRequired } from "./authBus";
import { getFriendlyMessage } from "./errorMessages";
import { LRUCache } from "./lruCache";
export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
  stale?: boolean;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  cacheMs?: number;
  bust?: boolean;
  suppressAuthModal?: boolean;
  dedupeMs?: number; // 
  maxRetries?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  writes: number;
  size: number;
}

export interface CacheLogEntry {
  type: "hit" | "hit_local" | "miss" | "write" | "invalidate";
  path: string;
  ts: number;
}

interface CircuitState {
  failures: number;
  openedAt: number;
}

interface CacheEntry {
  response: ApiResponse;
  expiresAt: number;
}
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 8000;
const LOCAL_CACHE_PREFIX = "mn_api_cache:";
const CACHE_LOG_LIMIT = 120;
const ADMIN_AUTH_INVALIDATED_EVENT = "admin-auth-invalidated";
const AUTH_SNAPSHOT_KEY = "admin_auth_snapshot";

const SILENT_AUTH_PATH_PREFIXES = [
  "/api/auth/me",
  "/api/progress",
  "/api/rewards",
  "/api/missions",
  "/api/notifications",
  "/api/history",
  "/api/bookmarks",
  "/api/follow",
  "/api/search",
  "/api/coupons",
  "/api/preferences",
  "/api/branding",
];
const inflightGets = new Map<string, Promise<ApiResponse>>();
const inflightRequests = new Map<string, Promise<ApiResponse>>();
const responseCache = new LRUCache<string, CacheEntry>(100);
const circuitState = new Map<string, CircuitState>();
const cacheStats = {
  hits: 0,
  misses: 0,
  writes: 0,
};
const cacheLog: CacheLogEntry[] = [];

type TrackFn = (event: string, props?: Record<string, unknown>) => void;

let analyticsTrack: TrackFn | null = null;
let analyticsLoadPromise: Promise<void> | null = null;

function isPayloadRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatErrorToastMessage(path: string, friendly: string, requestId?: string): string {
  if (path.startsWith("/api/admin") && requestId) {
    return `${friendly} Request ID: ${requestId}`;
  }

  return friendly;
}

function readPayloadString(payload: unknown, key: string): string | undefined {
  if (!isPayloadRecord(payload)) {
    return undefined;
  }
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

function trackEvent(event: string, props: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") {
    return;
  }

  if (analyticsTrack) {
    analyticsTrack(event, props);
    return;
  }

  if (!analyticsLoadPromise) {
    analyticsLoadPromise = import("./analytics")
      .then((mod) => {
        if (typeof mod.track === "function") {
          analyticsTrack = mod.track as TrackFn;
        }
      })
      .catch(() => undefined)
      .finally(() => {
        analyticsLoadPromise = null;
      });
  }

  void analyticsLoadPromise.then(() => {
    if (analyticsTrack) {
      analyticsTrack(event, props);
    }
  });
}

// ============ Base URL helpers ============

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.API_BASE_URL;

  if (envBase) {
    return envBase.replace(/\/$/, "");
  }

  return "http://localhost:4000";
}

function notifyAdminAuthInvalidated(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(AUTH_SNAPSHOT_KEY);
  } catch {
    // Ignore storage removal failures.
  }

  window.dispatchEvent(new Event(ADMIN_AUTH_INVALIDATED_EVENT));
}

function isSilentAuthPath(path: string): boolean {
  return SILENT_AUTH_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function getCircuitKey(path: string): string {
  return path;
}

/**
 * 
 * 
 * 
 */
function getDedupeKey(path: string, method: string, body?: unknown): string {
  if (!body || method === "GET") {
    return `${method}:${path}`;
  }
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  return `${method}:${path}:${bodyStr}`;
}

function isCircuitOpen(path: string): boolean {
  const key = getCircuitKey(path);
  const state = circuitState.get(key);
  if (!state || !state.openedAt) {
    return false;
  }
  if (Date.now() - state.openedAt > CIRCUIT_OPEN_MS) {
    circuitState.set(key, { failures: 0, openedAt: 0 });
    return false;
  }
  return true;
}

function recordFailure(path: string): void {
  const key = getCircuitKey(path);
  const prev = circuitState.get(key) || { failures: 0, openedAt: 0 };
  const nextFailures = prev.failures + 1;
  const openedAt =
    nextFailures >= CIRCUIT_THRESHOLD ? Date.now() : prev.openedAt || 0;
  circuitState.set(key, { failures: nextFailures, openedAt });
}

function recordSuccess(path: string): void {
  const key = getCircuitKey(path);
  circuitState.set(key, { failures: 0, openedAt: 0 });
}

function getDefaultCacheMs(path: string): number {
  if (/^\/api\/branding(\?|$)/.test(path)) {
    return 60_000;
  }
  if (/^\/api\/tracking(\?|$)/.test(path)) {
    return 60_000;
  }
  if (/^\/api\/regions\/config(\?|$)/.test(path)) {
    return 60_000;
  }

  if (/^\/api\/series(\?|$)/.test(path)) {
    return 300_000;
  }

  if (/^\/api\/series\/[^/]+(\?|$)/.test(path)) {
    return 300_000;
  }
  if (/^\/api\/series\/[^/]+\/episodes\/[^/]+(\?|$)/.test(path)) {
    return 600_000;
  }
  if (/^\/api\/notifications(\?|$)/.test(path)) {
    return 5_000;
  }
  if (/^\/api\/rankings(\?|$)/.test(path)) {
    return 600_000;
  }
  if (/^\/api\/recommendations\/homepage(\?|$)/.test(path)) {
    return 60_000;
  }
  if (/^\/api\/search(\?|$)/.test(path)) {
    return 120_000;
  }
  if (/^\/api\/search\/keywords(\?|$)/.test(path)) {
    return 300_000;
  }
  if (/^\/api\/search\/hot(\?|$)/.test(path)) {
    return 60_000;
  }
  if (/^\/api\/search\/suggest(\?|$)/.test(path)) {
    return 30_000;
  }
  return 0;
}

function readCache(path: string): ApiResponse | null {
  const entry = responseCache.get(path);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(path);
    return null;
  }
  return entry.response;
}

function readLocalCache(path: string): ApiResponse | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(`${LOCAL_CACHE_PREFIX}${path}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(`${LOCAL_CACHE_PREFIX}${path}`);
      return null;
    }
    return parsed.response;
  } catch (err) {
    return null;
  }
}

function writeCache(path: string, response: ApiResponse, cacheMs: number): void {
  if (!cacheMs || cacheMs <= 0) {
    return;
  }
  responseCache.set(path, {
    response,
    expiresAt: Date.now() + cacheMs,
  });
  cacheStats.writes += 1;
  cacheLog.push({ type: "write", path, ts: Date.now() });
  if (cacheLog.length > CACHE_LOG_LIMIT) {
    cacheLog.shift();
  }
}

function writeLocalCache(path: string, response: ApiResponse, cacheMs: number): void {
  if (!cacheMs || cacheMs <= 0) {
    return;
  }
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      `${LOCAL_CACHE_PREFIX}${path}`,
      JSON.stringify({
        response,
        expiresAt: Date.now() + cacheMs,
      })
    );
  } catch (err) {
    // ignore storage errors
  }
}

function invalidateCacheByPrefix(prefix: string): void {
  responseCache.forEach((_value, key) => {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
      cacheLog.push({ type: "invalidate", path: key, ts: Date.now() });
      if (cacheLog.length > CACHE_LOG_LIMIT) {
        cacheLog.shift();
      }
    }
  });

  if (typeof window === "undefined") {
    return;
  }

  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(LOCAL_CACHE_PREFIX) && key.slice(LOCAL_CACHE_PREFIX.length).startsWith(prefix))
      .forEach((key) => {
        window.localStorage.removeItem(key);
        cacheLog.push({
          type: "invalidate",
          path: key.slice(LOCAL_CACHE_PREFIX.length),
          ts: Date.now(),
        });
        if (cacheLog.length > CACHE_LOG_LIMIT) {
          cacheLog.shift();
        }
      });
  } catch (err) {
    // ignore storage errors
  }
}

function invalidateCacheForWrite(path: string): void {
  if (path.startsWith("/api/auth/")) {
    [
      "/api/auth",
      "/api/preferences",
      "/api/progress",
      "/api/rewards",
      "/api/missions",
      "/api/notifications",
      "/api/history",
      "/api/bookmarks",
      "/api/follow",
      "/api/orders",
      "/api/wallet",
      "/api/coupons",
    ].forEach((prefix) => invalidateCacheByPrefix(prefix));
  }
  if (path.startsWith("/api/notifications")) {
    invalidateCacheByPrefix("/api/notifications");
  }
  if (path.startsWith("/api/wallet")) {
    invalidateCacheByPrefix("/api/wallet");
  }
  if (path.startsWith("/api/entitlements")) {
    invalidateCacheByPrefix("/api/entitlements");
  }
  if (path.startsWith("/api/subscription")) {
    invalidateCacheByPrefix("/api/wallet");
  }
  if (path.startsWith("/api/coupons")) {
    invalidateCacheByPrefix("/api/coupons");
  }
  if (path.startsWith("/api/promotions")) {
    invalidateCacheByPrefix("/api/promotions");
  }
  if (path.startsWith("/api/admin/promotions")) {
    invalidateCacheByPrefix("/api/promotions");
  }
  if (path.startsWith("/api/admin/promotions/defaults")) {
    invalidateCacheByPrefix("/api/promotions");
  }
  if (path.startsWith("/api/admin/branding")) {
    invalidateCacheByPrefix("/api/branding");
  }
  if (path.startsWith("/api/admin/series")) {
    invalidateCacheByPrefix("/api/series");
  }
  if (path.startsWith("/api/ratings")) {
    invalidateCacheByPrefix("/api/series");
  }
  if (path.startsWith("/api/payments")) {
    invalidateCacheByPrefix("/api/orders");
    invalidateCacheByPrefix("/api/wallet");
  }
  if (path.startsWith("/api/orders/reconcile")) {
    invalidateCacheByPrefix("/api/orders");
  }
  if (path.startsWith("/api/events")) {
    invalidateCacheByPrefix("/api/events");
  }
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
}

async function requestJson(
  path: string,
  options: ApiRequestOptions & { method: string }
): Promise<ApiResponse> {
  const baseUrl = getBaseUrl();
  const maxRetries = options?.maxRetries || 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const headers = { ...options?.headers };

      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        cache: options?.bust ? "no-store" : undefined,
        headers,
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const payload = await parseJson(response);
      const payloadRecord = isPayloadRecord(payload) ? payload : null;
      if (!response.ok) {
        if (readPayloadString(payloadRecord, "error") === "ADULT_GATED") {
          trackEvent("adult_gate_blocked", {
            path,
            reason: readPayloadString(payloadRecord, "reason"),
            status: response.status,
            requestId: readPayloadString(payloadRecord, "requestId"),
          });
        }
        const errorPayload: ApiResponse = {
          ok: false,
          status: response.status,
          error: readPayloadString(payloadRecord, "error") || response.statusText,
          requestId: readPayloadString(payloadRecord, "requestId"),
          ...(payloadRecord || {}),
        };
        const friendly = getFriendlyMessage(errorPayload.error, errorPayload.message);
        if (response.status === 401) {
          if (path.startsWith("/api/admin")) {
            notifyAdminAuthInvalidated();
          }
          const suppressAuth =
            options?.suppressAuthModal ||
            path.startsWith("/api/admin") ||
            isSilentAuthPath(path);
          if (!suppressAuth) {
            // emitAuthRequired({ path });
          }
          return errorPayload;
        }
        if (!path.startsWith("/api/events")) {
          trackEvent("api_error", {
            path,
            status: response.status,
            errorCode: errorPayload.error,
            requestId: readPayloadString(payloadRecord, "requestId"),
          });
        }
        if (response.status >= 500) {
          const requestId = readPayloadString(payloadRecord, "requestId");
          emitToast({
            message: formatErrorToastMessage(path, friendly, requestId),
          });
        } else if (response.status >= 400) {
          emitToast({ message: friendly });
        }
        return errorPayload;
      }
      return {
        ok: true,
        status: response.status,
        data: payload,
        requestId: readPayloadString(payloadRecord, "requestId"),
      };
    } catch (err) {
      const isSilentNetworkPath =
        path.startsWith("/api/health") ||
        path.startsWith("/api/tracking") ||
        path.startsWith("/api/auth/me") ||
        path.startsWith("/api/meta") ||
        path.startsWith("/api/branding") ||
        path.startsWith("/api/preferences") ||
        path.startsWith("/api/regions") ||
        path.startsWith("/api/progress") ||
        path.startsWith("/api/rewards") ||
        path.startsWith("/api/notifications") ||
        path.startsWith("/api/events") ||
        path.startsWith("/api/search/hot") ||
        path.startsWith("/api/series") ||
        path.startsWith("/api/follow") ||
        path.startsWith("/api/history") ||
        path.startsWith("/api/bookmarks") ||
        path.startsWith("/api/missions");
      if (!isSilentNetworkPath) {
        emitToast({ message: getFriendlyMessage("NETWORK_ERROR", "Network issue. Please try again.") });
      }
      if (!path.startsWith("/api/events")) {
        trackEvent("api_error", { path, status: 0, errorCode: "NETWORK_ERROR" });
      }
      return {
        ok: false,
        status: 0,
        error: err instanceof Error && err.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
      };
    }
  }
}
export function getApiBaseUrl(): string {
  return getBaseUrl();
}

export async function apiGet<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const cacheMs = options.cacheMs ?? getDefaultCacheMs(path);
  if (!options.bust && cacheMs > 0) {
    const cached = readCache(path);
    if (cached) {
      cacheStats.hits += 1;
      cacheLog.push({ type: "hit", path, ts: Date.now() });
      if (cacheLog.length > CACHE_LOG_LIMIT) {
        cacheLog.shift();
      }
      return cached as ApiResponse<T>;
    }
    const localCached = readLocalCache(path);
    if (localCached) {
      cacheStats.hits += 1;
      cacheLog.push({ type: "hit_local", path, ts: Date.now() });
      if (cacheLog.length > CACHE_LOG_LIMIT) {
        cacheLog.shift();
      }
      return { ...localCached, stale: true } as ApiResponse<T>;
    }
    cacheStats.misses += 1;
    cacheLog.push({ type: "miss", path, ts: Date.now() });
    if (cacheLog.length > CACHE_LOG_LIMIT) {
      cacheLog.shift();
    }
  }
  const dedupeMs = options.dedupeMs ?? 300;
  if (dedupeMs > 0) {
    const dedupeKey = getDedupeKey(path, "GET");
    if (inflightRequests.has(dedupeKey)) {
      return inflightRequests.get(dedupeKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = (async () => {
      const attempts = 2;
      let lastResponse: ApiResponse | null = null;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const response = await requestJson(path, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
          suppressAuthModal: options?.suppressAuthModal,
        });
        lastResponse = response;
        if (response.ok) {
          recordSuccess(path);
          writeCache(path, response, cacheMs);
          writeLocalCache(path, response, cacheMs);
          return response;
        }
        if (response.status === 0 || response.status >= 500) {
          recordFailure(path);
          if (attempt < attempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
            continue;
          }
        }
        return response;
      }
      return lastResponse || { ok: false, status: 0, error: "UNKNOWN_ERROR" };
    })();

    inflightRequests.set(dedupeKey, requestPromise);
    try {
      return (await requestPromise) as ApiResponse<T>;
    } finally {
      setTimeout(() => inflightRequests.delete(dedupeKey), dedupeMs);
    }
  }
  if (inflightGets.has(path)) {
    return inflightGets.get(path) as Promise<ApiResponse<T>>;
  }
  if (isCircuitOpen(path)) {
    return {
      ok: false,
      status: 503,
      error: "CIRCUIT_OPEN",
    };
  }
  const requestPromise = (async () => {
    const attempts = 2;
    let lastResponse: ApiResponse | null = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const response = await requestJson(path, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
        suppressAuthModal: options?.suppressAuthModal,
      });
      lastResponse = response;
      if (response.ok) {
        recordSuccess(path);
        writeCache(path, response, cacheMs);
        writeLocalCache(path, response, cacheMs);
        return response;
      }
      if (response.status === 0 || response.status >= 500) {
        recordFailure(path);
        if (attempt < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
          continue;
        }
      }
      return response;
    }
    return lastResponse || { ok: false, status: 0, error: "UNKNOWN_ERROR" };
  })();
  inflightGets.set(path, requestPromise);
  try {
    return (await requestPromise) as ApiResponse<T>;
  } finally {
    inflightGets.delete(path);
  }
}

export async function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const dedupeMs = options.dedupeMs ?? 300; // 
  if (dedupeMs > 0) {
    const dedupeKey = getDedupeKey(path, "POST", body);
    if (inflightRequests.has(dedupeKey)) {
      return inflightRequests.get(dedupeKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = (async () => {
      const response = await requestJson(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...options.headers },
        body: JSON.stringify(body || {}),
        timeoutMs: options.timeoutMs,
      });
      if (response.ok) {
        recordSuccess(path);
        invalidateCacheForWrite(path);
      } else if (response.status === 0 || response.status >= 500) {
        recordFailure(path);
      }
      return response;
    })();

    inflightRequests.set(dedupeKey, requestPromise);
    try {
      return (await requestPromise) as ApiResponse<T>;
    } finally {
      setTimeout(() => inflightRequests.delete(dedupeKey), dedupeMs);
    }
  }
  const response = await requestJson(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...options.headers },
    body: JSON.stringify(body || {}),
    timeoutMs: options.timeoutMs,
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response as ApiResponse<T>;
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const dedupeMs = options.dedupeMs ?? 300;
  if (dedupeMs > 0) {
    const dedupeKey = `POST:${path}:upload`;
    if (inflightRequests.has(dedupeKey)) {
      return inflightRequests.get(dedupeKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = (async () => {
      const response = await requestJson(path, {
        method: "POST",
        headers: options.headers,
        body: formData,
        timeoutMs: options.timeoutMs,
      });
      if (response.ok) {
        recordSuccess(path);
        invalidateCacheForWrite(path);
      } else if (response.status === 0 || response.status >= 500) {
        recordFailure(path);
      }
      return response;
    })();

    inflightRequests.set(dedupeKey, requestPromise);
    try {
      return (await requestPromise) as ApiResponse<T>;
    } finally {
      setTimeout(() => inflightRequests.delete(dedupeKey), dedupeMs);
    }
  }
  const response = await requestJson(path, {
    method: "POST",
    headers: options.headers,
    body: formData,
    timeoutMs: options.timeoutMs,
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response as ApiResponse<T>;
}

export async function apiPatch<T = unknown>(
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const dedupeMs = options.dedupeMs ?? 300; // 
  if (dedupeMs > 0) {
    const dedupeKey = getDedupeKey(path, "PATCH", body);
    if (inflightRequests.has(dedupeKey)) {
      return inflightRequests.get(dedupeKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = (async () => {
      const response = await requestJson(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...options.headers },
        body: JSON.stringify(body || {}),
        timeoutMs: options.timeoutMs,
      });
      if (response.ok) {
        recordSuccess(path);
        invalidateCacheForWrite(path);
      } else if (response.status === 0 || response.status >= 500) {
        recordFailure(path);
      }
      return response;
    })();

    inflightRequests.set(dedupeKey, requestPromise);
    try {
      return (await requestPromise) as ApiResponse<T>;
    } finally {
      setTimeout(() => inflightRequests.delete(dedupeKey), dedupeMs);
    }
  }
  const response = await requestJson(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...options.headers },
    body: JSON.stringify(body || {}),
    timeoutMs: options.timeoutMs,
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response as ApiResponse<T>;
}

export async function apiDelete<T = unknown>(
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const dedupeMs = options.dedupeMs ?? 300; // 
  if (dedupeMs > 0) {
    const dedupeKey = getDedupeKey(path, "DELETE", body);
    if (inflightRequests.has(dedupeKey)) {
      return inflightRequests.get(dedupeKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = (async () => {
      const response = await requestJson(path, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...options.headers },
        body: body ? JSON.stringify(body) : undefined,
        timeoutMs: options.timeoutMs,
      });
      if (response.ok) {
        recordSuccess(path);
        invalidateCacheForWrite(path);
      } else if (response.status === 0 || response.status >= 500) {
        recordFailure(path);
      }
      return response;
    })();

    inflightRequests.set(dedupeKey, requestPromise);
    try {
      return (await requestPromise) as ApiResponse<T>;
    } finally {
      setTimeout(() => inflightRequests.delete(dedupeKey), dedupeMs);
    }
  }
  const response = await requestJson(path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...options.headers },
    body: body ? JSON.stringify(body) : undefined,
    timeoutMs: options.timeoutMs,
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response as ApiResponse<T>;
}
export function getCacheStats(): CacheStats {
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    writes: cacheStats.writes,
    size: responseCache.size,
  };
}

export function resetCacheStats(): void {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.writes = 0;
}

export function getCacheLog(): CacheLogEntry[] {
  return [...cacheLog];
}




