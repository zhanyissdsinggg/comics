/**
 * Admin API client helpers for the frontend admin console.
 * Keeps auth headers and CSRF handling in one place.
 */

import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  apiUpload,
  getApiBaseUrl,
  ApiResponse,
  ApiRequestOptions,
} from "./apiClient";

// ============ Shared types ============

export interface AdminApiOptions extends ApiRequestOptions {
  skipCsrf?: boolean;
}

export type AdminApiRecord = Record<string, unknown>;
export type AdminApiPayload = Record<string, unknown>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const ADMIN_AUTH_INVALIDATED_EVENT = "admin-auth-invalidated";
const AUTH_SNAPSHOT_KEY = "admin_auth_snapshot";

// ============ Auth and headers ============

/**
 * Read the CSRF token from the document head.
 */

function getCsrfToken(): string {
  if (typeof document === "undefined") {
    return "";
  }
  const token = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");
  return token || "";
}

/**
 * Attach CSRF headers for unsafe HTTP methods.
 */
function addCsrfToken(
  headers: Record<string, string>,
  method?: string,
): Record<string, string> {
  if (!method || !["POST", "PATCH", "DELETE"].includes(method.toUpperCase())) {
    return headers;
  }

  const csrfToken = getCsrfToken();
  if (csrfToken && !headers["X-CSRF-Token"]) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return headers;
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

function toHeaderRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

/**
 * Build admin request headers with auth and CSRF protection.
 */

function prepareAdminHeaders(
  method?: string,
  customHeaders?: HeadersInit,
): Record<string, string> {
  const headers = toHeaderRecord(customHeaders);

  // Add CSRF protection before sending write requests.
  addCsrfToken(headers, method);

  return headers;
}

// ============ Request helpers ============

/**
 * Low-level fetch helper used by admin API wrappers.
 */

export async function adminFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = options.method || "GET";
  const headers = prepareAdminHeaders(method, options.headers);

  // Reuse the prepared headers and always send cookies.
  const finalOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || "include",
  };

  const response = await fetch(url, finalOptions);
  if (response.status === 401) {
    notifyAdminAuthInvalidated();
  }
  return response;
}

export async function adminFetchJson<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<{ response: Response; data: T }> {
  const response = await adminFetch(url, options);
  const data = await response.json().catch(() => ({}) as T);
  return { response, data };
}

function extractAdminMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const candidate =
    (payload as Record<string, unknown>).message ??
    (payload as Record<string, unknown>).error ??
    (payload as Record<string, unknown>).details;

  if (Array.isArray(candidate)) {
    return (
      candidate.find((item) => typeof item === "string" && item.trim()) || ""
    );
  }

  return typeof candidate === "string" ? candidate.trim() : "";
}

export function normalizeAdminErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  const rawMessage =
    error instanceof Error
      ? String(error.message || "").trim()
      : typeof error === "string"
        ? error.trim()
        : "";

  if (!rawMessage) {
    return fallbackMessage;
  }

  const normalized = rawMessage.toLowerCase();
  if (
    normalized === "fetch failed" ||
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror when attempting to fetch resource") ||
    normalized.includes("load failed")
  ) {
    return fallbackMessage;
  }

  return rawMessage;
}

export async function readAdminResponseMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const text = await response.text();
    if (!text.trim()) {
      return fallbackMessage;
    }

    try {
      const parsed = JSON.parse(text);
      const message = extractAdminMessage(parsed);
      if (message) {
        return message;
      }
    } catch {
      // Ignore JSON parsing failures and fall back to the raw response body.
    }

    return text.trim();
  } catch {
    return fallbackMessage;
  }
}
/**
 * Admin GET request wrapper.
 */
export async function adminGet<T = unknown>(
  path: string,
  options: AdminApiOptions = {},
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("GET", options.headers);
  return apiGet<T>(path, { ...options, headers });
}

/**
 * Admin POST request wrapper.
 */
export async function adminPost<T = unknown>(
  path: string,
  body?: AdminApiPayload,
  options: AdminApiOptions = {},
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("POST", options.headers);
  return apiPost<T>(path, body, { ...options, headers });
}

/**
 * Admin PATCH request wrapper.
 */
export async function adminPatch<T = unknown>(
  path: string,
  body?: AdminApiPayload,
  options: AdminApiOptions = {},
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("PATCH", options.headers);
  return apiPatch<T>(path, body, { ...options, headers });
}

/** Admin DELETE request wrapper. */

export async function adminDelete<T = unknown>(
  path: string,
  body?: AdminApiPayload,
  options: AdminApiOptions = {},
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("DELETE", options.headers);
  return apiDelete<T>(path, body, { ...options, headers });
}

/**
 * Admin multipart upload wrapper.
 */

export async function adminUpload<T = unknown>(
  path: string,
  formData: FormData,
  options: AdminApiOptions = {},
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("POST", options.headers);
  return apiUpload<T>(path, formData, { ...options, headers });
}

// ============ Admin resource helpers ============

/** Fetch admin users. */

export async function getAdminUsers(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {},
): Promise<ApiResponse<PaginatedResponse<AdminApiRecord>>> {
  return adminGet(
    `/api/admin/users?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

/** Fetch admin orders. */

export async function getAdminOrders(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {},
): Promise<ApiResponse<PaginatedResponse<AdminApiRecord>>> {
  return adminGet(
    `/api/admin/orders?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

/** Fetch admin notifications. */

export async function getAdminNotifications(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {},
): Promise<ApiResponse<PaginatedResponse<AdminApiRecord>>> {
  return adminGet(
    `/api/admin/notifications?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

/** Fetch admin promotions. */

export async function getAdminPromotions(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {},
): Promise<ApiResponse<PaginatedResponse<AdminApiRecord>>> {
  return adminGet(
    `/api/admin/promotions?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

/** Create an admin promotion. */

export async function createAdminPromotion(
  data: AdminApiPayload,
  options: AdminApiOptions = {},
): Promise<ApiResponse<AdminApiRecord>> {
  return adminPost("/api/admin/promotions", data, options);
}

/** Update an admin promotion. */

export async function updateAdminPromotion(
  id: string,
  data: AdminApiPayload,
  options: AdminApiOptions = {},
): Promise<ApiResponse<AdminApiRecord>> {
  return adminPatch(`/api/admin/promotions/${id}`, data, options);
}

/** Delete an admin promotion. */

export async function deleteAdminPromotion(
  id: string,
  options: AdminApiOptions = {},
): Promise<ApiResponse<AdminApiRecord>> {
  return adminDelete(`/api/admin/promotions/${id}`, undefined, options);
}

/**
 * Fetch admin branding settings.
 */
export async function getAdminBranding(
  options: AdminApiOptions = {},
): Promise<ApiResponse<AdminApiRecord>> {
  return adminGet("/api/admin/branding", options);
}

/**
 * Update admin branding settings.
 */
export async function updateAdminBranding(
  data: AdminApiPayload,
  options: AdminApiOptions = {},
): Promise<ApiResponse<AdminApiRecord>> {
  return adminPatch("/api/admin/branding", data, options);
}

/** Fetch admin series. */

export async function getAdminSeries(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {},
): Promise<ApiResponse<PaginatedResponse<AdminApiRecord>>> {
  return adminGet(
    `/api/admin/series?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

/** Create an admin series item. */

export async function createAdminSeries(
  data: AdminApiPayload,
  options: AdminApiOptions = {},
): Promise<ApiResponse<AdminApiRecord>> {
  return adminPost("/api/admin/series", data, options);
}

/** Update an admin series item. */

export async function updateAdminSeries(
  id: string,
  data: AdminApiPayload,
  options: AdminApiOptions = {},
): Promise<ApiResponse<AdminApiRecord>> {
  return adminPatch(`/api/admin/series/${id}`, data, options);
}

/** Delete an admin series item. */

export async function deleteAdminSeries(
  id: string,
  options: AdminApiOptions = {},
): Promise<ApiResponse<AdminApiRecord>> {
  return adminDelete(`/api/admin/series/${id}`, undefined, options);
}

/** Fetch admin comments. */

export async function getAdminComments(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {},
): Promise<ApiResponse<PaginatedResponse<AdminApiRecord>>> {
  return adminGet(
    `/api/admin/comments?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

/** Delete an admin comment. */

export async function deleteAdminComment(
  id: string,
  options: AdminApiOptions = {},
): Promise<ApiResponse<AdminApiRecord>> {
  return adminDelete(`/api/admin/comments/${id}`, undefined, options);
}

/** Fetch admin logs. */

export async function getAdminLogs(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {},
): Promise<ApiResponse<PaginatedResponse<AdminApiRecord>>> {
  return adminGet(`/api/admin/logs?page=${page}&pageSize=${pageSize}`, options);
}

/** Fetch admin billing entries. */

export async function getAdminBilling(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {},
): Promise<ApiResponse<PaginatedResponse<AdminApiRecord>>> {
  return adminGet(
    `/api/admin/billing?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

/**
 * Get the shared API base URL for admin calls.
 */

export function getAdminApiBaseUrl(): string {
  return getApiBaseUrl();
}
