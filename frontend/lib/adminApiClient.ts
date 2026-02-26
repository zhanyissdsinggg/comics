/**
 * Admin API客户端 - 前端专用
 * 老王说：这个SB文件合并了adminApiClient.js和adminFetch.ts
 * 基于通用apiClient扩展，提供admin特定的便捷函数和CSRF保护
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

// ============ 类型定义 ============

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

// ============ 工具函数 ============

/**
 * 获取CSRF token
 * 从meta标签中读取CSRF token，用于防止CSRF攻击
 */
function getCsrfToken(): string {
  if (typeof document === "undefined") {
    return "";
  }
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
  return token || "";
}

/**
 * 添加CSRF token到请求头
 * 老王说：POST/PATCH/DELETE请求必须加CSRF token，这是铁律
 */
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
 * 准备admin请求的headers
 * 老王说：统一处理Authorization和CSRF token
 */
function prepareAdminHeaders(
  method?: string,
  customHeaders?: Record<string, string>
): Record<string, string> {
  const headers = { ...customHeaders };

  // 添加CSRF token（POST/PATCH/DELETE）
  return addCsrfToken(headers, method);
}

// ============ 导出的API函数 ============

/**
 * 通用的Admin Fetch函数
 * 老王说：这个SB函数就是标准fetch的admin版本，自动加headers和CSRF token
 * 返回标准的Response对象，不是ApiResponse
 */
export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || "GET";
  const headers = prepareAdminHeaders(method, options.headers as Record<string, string>);

  // 合并headers
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
 * Admin GET请求
 * 老王说：简单的GET请求就用这个，别tm写那么多代码
 */
export async function adminGet<T = any>(
  path: string,
  options: AdminApiOptions = {}
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("GET", options.headers);
  return apiGet<T>(path, { ...options, headers });
}

/**
 * Admin POST请求
 * 老王说：POST请求用这个，自动处理JSON序列化和CSRF保护
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
 * Admin PATCH请求
 * 老王说：PATCH请求用这个，自动处理JSON序列化和CSRF保护
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
 * Admin DELETE请求
 * 老王说：DELETE请求用这个，简单粗暴
 */
export async function adminDelete<T = any>(
  path: string,
  body?: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("DELETE", options.headers);
  return apiDelete<T>(path, body, { ...options, headers });
}

/**
 * Admin文件上传
 * 老王说：上传文件用这个，自动处理FormData和CSRF保护
 */
export async function adminUpload<T = any>(
  path: string,
  formData: FormData,
  options: AdminApiOptions = {}
): Promise<ApiResponse<T>> {
  const headers = prepareAdminHeaders("POST", options.headers);
  return apiUpload<T>(path, formData, { ...options, headers });
}

// ============ Admin特定的便捷函数 ============

/**
 * 获取admin用户列表
 */
export async function getAdminUsers(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/users?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 获取admin订单列表
 */
export async function getAdminOrders(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/orders?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 获取admin通知列表
 */
export async function getAdminNotifications(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/notifications?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 获取admin促销列表
 */
export async function getAdminPromotions(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/promotions?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 创建admin促销
 */
export async function createAdminPromotion(
  data: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminPost("/api/admin/promotions", data, options);
}

/**
 * 更新admin促销
 */
export async function updateAdminPromotion(
  id: string,
  data: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminPatch(`/api/admin/promotions/${id}`, data, options);
}

/**
 * 删除admin促销
 */
export async function deleteAdminPromotion(
  id: string,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminDelete(`/api/admin/promotions/${id}`, undefined, options);
}

/**
 * 获取admin品牌设置
 */
export async function getAdminBranding(
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminGet("/api/admin/branding", options);
}

/**
 * 更新admin品牌设置
 */
export async function updateAdminBranding(
  data: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminPatch("/api/admin/branding", data, options);
}

/**
 * 获取admin系列列表
 */
export async function getAdminSeries(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/series?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 创建admin系列
 */
export async function createAdminSeries(
  data: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminPost("/api/admin/series", data, options);
}

/**
 * 更新admin系列
 */
export async function updateAdminSeries(
  id: string,
  data: any,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminPatch(`/api/admin/series/${id}`, data, options);
}

/**
 * 删除admin系列
 */
export async function deleteAdminSeries(
  id: string,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminDelete(`/api/admin/series/${id}`, undefined, options);
}

/**
 * 获取admin评论列表
 */
export async function getAdminComments(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/comments?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 删除admin评论
 */
export async function deleteAdminComment(
  id: string,
  options: AdminApiOptions = {}
): Promise<ApiResponse<any>> {
  return adminDelete(`/api/admin/comments/${id}`, undefined, options);
}

/**
 * 获取admin日志列表
 */
export async function getAdminLogs(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/logs?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 获取admin账单列表
 */
export async function getAdminBilling(
  page: number = 1,
  pageSize: number = 20,
  options: AdminApiOptions = {}
): Promise<ApiResponse<PaginatedResponse<any>>> {
  return adminGet(`/api/admin/billing?page=${page}&pageSize=${pageSize}`, options);
}

/**
 * 获取API基础URL
 * 老王说：有时候前端需要知道API基础URL，比如构建文件上传的完整URL
 */
export function getAdminApiBaseUrl(): string {
  return getApiBaseUrl();
}
