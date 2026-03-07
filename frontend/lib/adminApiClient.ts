/**
 * Admin API瀹㈡埛绔?- 鍓嶇涓撶敤
 * NOTE: cleaned corrupted comment.
 * NOTE: cleaned corrupted comment.
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

// ============ 绫诲瀷瀹氫箟 ============

export interface AdminApiOptions extends ApiRequestOptions {
  skipCsrf?: boolean;
}

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

const ACCESS_TOKEN_KEY = "admin_token";
const REFRESH_TOKEN_KEY = "admin_refresh_token";

// ============ 宸ュ叿鍑芥暟 ============

/**
 * 鑾峰彇CSRF token
 * NOTE: cleaned corrupted comment.
 */
function getCsrfToken(): string {
  if (typeof document === "undefined") {
    return "";
  }
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
  return token || "";
}

/**
 * 娣诲姞CSRF token鍒拌姹傚ご
 * NOTE: cleaned corrupted comment. */
function addCsrfToken(headers: Record<string, string>, method?: string): Record<string, string> {
  if (!method || !["POST", "PATCH", "DELETE"].includes(method.toUpperCase())) {
    return headers;
  }

  const csrfToken = getCsrfToken();
  if (csrfToken && !headers["X-CSRF-Token"]) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return headers;
}

function getAdminAccessToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

function clearAdminTokens(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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
 * 鍑嗗admin璇锋眰鐨刪eaders
 * NOTE: cleaned corrupted comment.
 */
function prepareAdminHeaders(
  method?: string,
  customHeaders?: HeadersInit
): Record<string, string> {
  const headers = toHeaderRecord(customHeaders);

  // NOTE: cleaned corrupted comment.
  addCsrfToken(headers, method);

  const accessToken = getAdminAccessToken();
  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

// ============ 瀵煎嚭鐨凙PI鍑芥暟 ============

/**
 * 閫氱敤鐨凙dmin Fetch鍑芥暟
 * NOTE: cleaned corrupted comment.
 * NOTE: cleaned corrupted comment.
 */
export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || "GET";
  const headers = prepareAdminHeaders(method, options.headers);

  // 鍚堝苟headers
  const finalOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || "include",
  };

  const response = await fetch(url, finalOptions);
  if (response.status === 401) {
    clearAdminTokens();
  }
  return response;
}

/**
 * Admin GET璇锋眰
 * NOTE: cleaned corrupted comment.
 */
export async function adminGet<T = any>(
  path: string,
  options: AdminApiOptions = {}
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("GET", options.headers);
  return apiGet<T>(path, { ...options, headers });
}

/**
 * Admin POST璇锋眰
 * NOTE: cleaned corrupted comment.
 */
export async function adminPost<T = any>(
  path: string,
  body?: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("POST", options.headers);
  return apiPost<T>(path, body, { ...options, headers });
}

/**
 * Admin PATCH璇锋眰
 * NOTE: cleaned corrupted comment.
 */
export async function adminPatch<T = any>(
  path: string,
  body?: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("PATCH", options.headers);
  return apiPatch<T>(path, body, { ...options, headers });
}

/**
 * Admin DELETE璇锋眰
 * NOTE: cleaned corrupted comment. */
export async function adminDelete<T = any>(
  path: string,
  body?: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("DELETE", options.headers);
  return apiDelete<T>(path, body, { ...options, headers });
}

/**
 * Admin鏂囦欢涓婁紶
 * NOTE: cleaned corrupted comment.
 */
export async function adminUpload<T = any>(
  path: string,
  formData: FormData,
  options: AdminApiOptions = {}
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("POST", options.headers);
  return apiUpload<T>(path, formData, { ...options, headers });
}

// ============ Admin鐗瑰畾鐨勪究鎹峰嚱鏁?============

/**
 * 鑾峰彇admin鐢ㄦ埛鍒楄〃
 */
export async function getAdminUsers(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/users?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 鑾峰彇admin璁㈠崟鍒楄〃
 */
export async function getAdminOrders(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/orders?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 鑾峰彇admin閫氱煡鍒楄〃
 */
export async function getAdminNotifications(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/notifications?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 鑾峰彇admin淇冮攢鍒楄〃
 */
export async function getAdminPromotions(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/promotions?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 鍒涘缓admin淇冮攢
 */
export async function createAdminPromotion(
  data: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminPost("/api/admin/promotions", data, options);
}

/**
 * 鏇存柊admin淇冮攢
 */
export async function updateAdminPromotion(
  id: string,
  data: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminPatch(`/api/admin/promotions/${id}`, data, options);
}

/**
 * 鍒犻櫎admin淇冮攢
 */
export async function deleteAdminPromotion(
  id: string,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminDelete(`/api/admin/promotions/${id}`, undefined, options);
}

/**
 * 鑾峰彇admin鍝佺墝璁剧疆
 */
export async function getAdminBranding(
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminGet("/api/admin/branding", options);
}

/**
 * 鏇存柊admin鍝佺墝璁剧疆
 */
export async function updateAdminBranding(
  data: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminPatch("/api/admin/branding", data, options);
}

/**
 * 鑾峰彇admin绯诲垪鍒楄〃
 */
export async function getAdminSeries(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/series?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 鍒涘缓admin绯诲垪
 */
export async function createAdminSeries(
  data: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminPost("/api/admin/series", data, options);
}

/**
 * 鏇存柊admin绯诲垪
 */
export async function updateAdminSeries(
  id: string,
  data: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminPatch(`/api/admin/series/${id}`, data, options);
}

/**
 * 鍒犻櫎admin绯诲垪
 */
export async function deleteAdminSeries(
  id: string,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminDelete(`/api/admin/series/${id}`, undefined, options);
}

/**
 * 鑾峰彇admin璇勮鍒楄〃
 */
export async function getAdminComments(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/comments?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 鍒犻櫎admin璇勮
 */
export async function deleteAdminComment(
  id: string,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminDelete(`/api/admin/comments/${id}`, undefined, options);
}

/**
 * 鑾峰彇admin鏃ュ織鍒楄〃
 */
export async function getAdminLogs(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/logs?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 鑾峰彇admin璐﹀崟鍒楄〃
 */
export async function getAdminBilling(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/billing?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 鑾峰彇API鍩虹URL
 * NOTE: cleaned corrupted comment.
 */
export function getAdminApiBaseUrl(): string {
  return getApiBaseUrl();
}
