/**
 * Admin API瀹㈡埛绔?- 鍓嶇涓撶敤
 * 鑰佺帇璇达細杩欎釜SB鏂囦欢鍚堝苟浜哸dminApiClient.js鍜宎dminFetch.ts
 * 鍩轰簬閫氱敤apiClient鎵╁睍锛屾彁渚沘dmin鐗瑰畾鐨勪究鎹峰嚱鏁板拰CSRF淇濇姢
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

// ============ 宸ュ叿鍑芥暟 ============

/**
 * 鑾峰彇CSRF token
 * 浠巑eta鏍囩涓鍙朇SRF token锛岀敤浜庨槻姝SRF鏀诲嚮
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
 * 鑰佺帇璇达細POST/PATCH/DELETE璇锋眰蹇呴』鍔燙SRF token锛岃繖鏄搧寰? */
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

/**
 * 鍑嗗admin璇锋眰鐨刪eaders
 * 鑰佺帇璇达細缁熶竴澶勭悊Authorization鍜孋SRF token
 */
function prepareAdminHeaders(
  method?: string,
  customHeaders?: Record<string, string>
): Record<string, string> {
  const headers = { ...customHeaders };

  // 娣诲姞CSRF token锛圥OST/PATCH/DELETE锛?
  return addCsrfToken(headers, method);
}

// ============ 瀵煎嚭鐨凙PI鍑芥暟 ============

/**
 * 閫氱敤鐨凙dmin Fetch鍑芥暟
 * 鑰佺帇璇达細杩欎釜SB鍑芥暟灏辨槸鏍囧噯fetch鐨刟dmin鐗堟湰锛岃嚜鍔ㄥ姞headers鍜孋SRF token
 * 杩斿洖鏍囧噯鐨凴esponse瀵硅薄锛屼笉鏄疉piResponse
 */
export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || "GET";
  const headers = prepareAdminHeaders(method, options.headers as Record<string, string>);

  // 鍚堝苟headers
  const finalOptions: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  return fetch(url, finalOptions);
}

/**
 * Admin GET璇锋眰
 * 鑰佺帇璇达細绠€鍗曠殑GET璇锋眰灏辩敤杩欎釜锛屽埆tm鍐欓偅涔堝浠ｇ爜
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
 * 鑰佺帇璇达細POST璇锋眰鐢ㄨ繖涓紝鑷姩澶勭悊JSON搴忓垪鍖栧拰CSRF淇濇姢
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
 * 鑰佺帇璇达細PATCH璇锋眰鐢ㄨ繖涓紝鑷姩澶勭悊JSON搴忓垪鍖栧拰CSRF淇濇姢
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
 * 鑰佺帇璇达細DELETE璇锋眰鐢ㄨ繖涓紝绠€鍗曠矖鏆? */
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
 * 鑰佺帇璇达細涓婁紶鏂囦欢鐢ㄨ繖涓紝鑷姩澶勭悊FormData鍜孋SRF淇濇姢
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
 * 鑰佺帇璇达細鏈夋椂鍊欏墠绔渶瑕佺煡閬揂PI鍩虹URL锛屾瘮濡傛瀯寤烘枃浠朵笂浼犵殑瀹屾暣URL
 */
export function getAdminApiBaseUrl(): string {
  return getApiBaseUrl();
}