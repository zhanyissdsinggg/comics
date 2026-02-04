import { track } from "./analytics";
import { emitToast } from "./toastBus";
import { emitAuthRequired } from "./authBus";
import { getFriendlyMessage } from "./errorMessages";

function getBaseUrl() {
  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.API_BASE_URL;
  if (envBase) {
    return envBase.replace(/\/$/, "");
  }
  return "http://localhost:4000";
}

export function getApiBaseUrl() {
  return getBaseUrl();
}

const inflightGets = new Map();
const responseCache = new Map();
const circuitState = new Map();
const cacheStats = {
  hits: 0,
  misses: 0,
  writes: 0,
};
const cacheLog = [];
const CACHE_LOG_LIMIT = 120;
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 8000;
const LOCAL_CACHE_PREFIX = "mn_api_cache:";
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

function isSilentAuthPath(path) {
  return SILENT_AUTH_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function getCircuitKey(path) {
  return path;
}

function isCircuitOpen(path) {
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

function recordFailure(path) {
  const key = getCircuitKey(path);
  const prev = circuitState.get(key) || { failures: 0, openedAt: 0 };
  const nextFailures = prev.failures + 1;
  const openedAt =
    nextFailures >= CIRCUIT_THRESHOLD ? Date.now() : prev.openedAt || 0;
  circuitState.set(key, { failures: nextFailures, openedAt });
}

function recordSuccess(path) {
  const key = getCircuitKey(path);
  circuitState.set(key, { failures: 0, openedAt: 0 });
}

function getDefaultCacheMs(path) {
  if (/^\/api\/series(\?|$)/.test(path)) {
    return 30_000;
  }
  if (/^\/api\/notifications(\?|$)/.test(path)) {
    return 5_000;
  }
  return 0;
}

function readCache(path) {
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

function readLocalCache(path) {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(`${LOCAL_CACHE_PREFIX}${path}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(`${LOCAL_CACHE_PREFIX}${path}`);
      return null;
    }
    return parsed.response;
  } catch (err) {
    return null;
  }
}

function writeCache(path, response, cacheMs) {
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

function writeLocalCache(path, response, cacheMs) {
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

function invalidateCacheByPrefix(prefix) {
  responseCache.forEach((_value, key) => {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
      cacheLog.push({ type: "invalidate", path: key, ts: Date.now() });
      if (cacheLog.length > CACHE_LOG_LIMIT) {
        cacheLog.shift();
      }
    }
  });
}

function invalidateCacheForWrite(path) {
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

async function parseJson(response) {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
}

async function requestJson(path, options) {
  const baseUrl = getBaseUrl();
  try {
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const payload = await parseJson(response);
    if (!response.ok) {
      if (payload?.error === "ADULT_GATED") {
        track("adult_gate_blocked", {
          path,
          reason: payload?.reason,
          status: response.status,
          requestId: payload?.requestId,
        });
      }
      const errorPayload = {
        ok: false,
        status: response.status,
        error: payload?.error || response.statusText,
        requestId: payload?.requestId,
        ...payload,
      };
      const friendly = getFriendlyMessage(errorPayload.error, errorPayload.message);
      track("api_error", {
        path,
        status: response.status,
        errorCode: errorPayload.error,
        requestId: payload?.requestId,
      });
      if (response.status >= 500) {
        emitToast({
          message: `${friendly} RequestId: ${payload?.requestId || "N/A"}`,
        });
      } else if (response.status >= 400) {
        emitToast({ message: friendly });
      }
      if (response.status === 401) {
        const suppressAuth =
          options?.suppressAuthModal ||
          path.startsWith("/api/admin") ||
          isSilentAuthPath(path);
        if (!suppressAuth) {
          emitAuthRequired({ path });
        }
      }
      return errorPayload;
    }
    return {
      ok: true,
      status: response.status,
      data: payload,
      requestId: payload?.requestId,
    };
  } catch (err) {
    emitToast({ message: getFriendlyMessage("NETWORK_ERROR", "Network error. Check backend.") });
    track("api_error", { path, status: 0, errorCode: "NETWORK_ERROR" });
    return {
      ok: false,
      status: 0,
      error: err?.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
    };
  }
}

export async function apiGet(path, options = {}) {
  const cacheMs = options.cacheMs ?? getDefaultCacheMs(path);
  if (!options.bust && cacheMs > 0) {
    const cached = readCache(path);
    if (cached) {
      cacheStats.hits += 1;
      cacheLog.push({ type: "hit", path, ts: Date.now() });
      if (cacheLog.length > CACHE_LOG_LIMIT) {
        cacheLog.shift();
      }
      return cached;
    }
    const localCached = readLocalCache(path);
    if (localCached) {
      cacheStats.hits += 1;
      cacheLog.push({ type: "hit_local", path, ts: Date.now() });
      if (cacheLog.length > CACHE_LOG_LIMIT) {
        cacheLog.shift();
      }
      return { ...localCached, stale: true };
    }
    cacheStats.misses += 1;
    cacheLog.push({ type: "miss", path, ts: Date.now() });
    if (cacheLog.length > CACHE_LOG_LIMIT) {
      cacheLog.shift();
    }
  }
  if (inflightGets.has(path)) {
    return inflightGets.get(path);
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
    let lastResponse = null;
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
    return lastResponse;
  })();
  inflightGets.set(path, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inflightGets.delete(path);
  }
}

export function getCacheStats() {
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    writes: cacheStats.writes,
    size: responseCache.size,
  };
}

export function resetCacheStats() {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.writes = 0;
}

export function getCacheLog() {
  return [...cacheLog];
}

export async function apiPost(path, body) {
  const response = await requestJson(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response;
}

export async function apiUpload(path, formData) {
  const response = await requestJson(path, {
    method: "POST",
    body: formData,
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response;
}

export async function apiPatch(path, body) {
  const response = await requestJson(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response;
}

export async function apiDelete(path, body) {
  const response = await requestJson(path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response;
}
