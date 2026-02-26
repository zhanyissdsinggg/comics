/**
 * 统一的API客户端 - 前后端共用
 * 老王说：这个SB文件合并了两个重复的apiClient.js，现在用TypeScript写得规规矩矩
 * 包含：缓存、熔断器、请求去重、错误处理、重试机制
 */

import { track } from "./analytics";
import { emitToast } from "./toastBus";
import { emitAuthRequired } from "./authBus";
import { getFriendlyMessage } from "./errorMessages";
import { LRUCache } from "./lruCache";

// ============ 类型定义 ============

export interface ApiResponse<T = any> {
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

// ============ 常量 ============

const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 8000;
const LOCAL_CACHE_PREFIX = "mn_api_cache:";
const CACHE_LOG_LIMIT = 120;

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

// ============ 内部状态 ============

const inflightGets = new Map<string, Promise<ApiResponse>>();
const responseCache = new LRUCache<string, CacheEntry>(100);
const circuitState = new Map<string, CircuitState>();
const cacheStats = {
  hits: 0,
  misses: 0,
  writes: 0,
};
const cacheLog: CacheLogEntry[] = [];

// ============ 工具函数 ============

function getBaseUrl(): string {
  // 优先使用环境变量（支持前后端分离部署）
  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.API_BASE_URL;

  if (envBase) {
    return envBase.replace(/\/$/, "");
  }

  // 如果没有配置环境变量，生产环境使用当前域名（前后端同域部署）
  if (typeof window !== "undefined" && !window.location.hostname.includes("localhost")) {
    return window.location.origin;
  }

  // 开发环境默认值
  return "http://localhost:4000";
}

function isSilentAuthPath(path: string): boolean {
  return SILENT_AUTH_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function getCircuitKey(path: string): string {
  return path;
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
  if (/^\/api\/series(\?|$)/.test(path)) {
    return 30_000;
  }
  if (/^\/api\/notifications(\?|$)/.test(path)) {
    return 5_000;
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
}

function invalidateCacheForWrite(path: string): void {
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

async function parseJson(response: Response): Promise<any> {
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
  try {
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // 老王说：如果是admin路径，添加JWT token到请求头
    const headers = { ...options?.headers };
    if (path.startsWith("/api/admin") && typeof window !== "undefined") {
      const token = window.localStorage.getItem("admin_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
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
      const errorPayload: ApiResponse = {
        ok: false,
        status: response.status,
        error: payload?.error || response.statusText,
        requestId: payload?.requestId,
        ...payload,
      };
      const friendly = getFriendlyMessage(errorPayload.error, errorPayload.message);
      // 老王注释：避免/api/events错误导致无限循环 - 不要track /api/events的错误
      if (!path.startsWith("/api/events")) {
        track("api_error", {
          path,
          status: response.status,
          errorCode: errorPayload.error,
          requestId: payload?.requestId,
        });
      }
      // 老王注释：移除401错误自动触发登录弹窗，让用户自由浏览
      if (response.status === 401) {
        // 老王修复：401错误静默处理，不显示toast和console错误
        const suppressAuth =
          options?.suppressAuthModal ||
          path.startsWith("/api/admin") ||
          isSilentAuthPath(path);
        if (!suppressAuth) {
          // emitAuthRequired({ path }); // 不触发登录弹窗
        }
        // 老王注释：静默返回401错误，不显示toast提示
        return errorPayload;
      }
      if (response.status >= 500) {
        emitToast({
          message: `${friendly} RequestId: ${payload?.requestId || "N/A"}`,
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
      requestId: payload?.requestId,
    };
  } catch (err) {
    emitToast({ message: getFriendlyMessage("NETWORK_ERROR", "Network error. Check backend.") });
    // 老王注释：避免/api/events错误导致无限循环 - 不要track /api/events的错误
    if (!path.startsWith("/api/events")) {
      track("api_error", { path, status: 0, errorCode: "NETWORK_ERROR" });
    }
    return {
      ok: false,
      status: 0,
      error: err instanceof Error && err.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
    };
  }
}

// ============ 导出的API函数 ============

export function getApiBaseUrl(): string {
  return getBaseUrl();
}

export async function apiGet<T = any>(
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

export async function apiPost<T = any>(
  path: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
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

export async function apiUpload<T = any>(
  path: string,
  formData: FormData,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
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

export async function apiPatch<T = any>(
  path: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
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

export async function apiDelete<T = any>(
  path: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
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

// ============ 缓存管理函数 ============

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
