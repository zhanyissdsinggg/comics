/**
 * 统一的Admin API调用客户端
 * 所有admin相关的API调用都通过这个模块进行
 * 提供统一的错误处理、重试机制和数据转换
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './apiClient';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

/**
 * 带重试机制的API调用
 */
async function apiWithRetry(fn, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
    }
  }
}

/**
 * 解析API响应中的列表数据
 */
function parseList(payload, keys = []) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
}

/**
 * 订单相关API
 */
export const ordersApi = {
  list: (filters = {}) =>
    apiWithRetry(() => {
      const params = new URLSearchParams();
      params.append('page', String(filters.page || 1));
      params.append('limit', String(filters.limit || 10));
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      return apiGet(`/api/admin/orders?${params.toString()}`);
    }),

  refund: (data) =>
    apiWithRetry(() => apiPost('/api/admin/orders/refund', data)),

  adjust: (data) =>
    apiWithRetry(() => apiPost('/api/admin/orders/adjust', data)),

  delete: (id) =>
    apiWithRetry(() => apiDelete(`/api/admin/orders/${id}`)),
};

/**
 * 用户相关API
 */
export const usersApi = {
  list: (filters = {}) =>
    apiWithRetry(() => {
      const params = new URLSearchParams();
      params.append('page', String(filters.page || 1));
      params.append('limit', String(filters.limit || 10));
      if (filters.search) params.append('search', filters.search);
      return apiGet(`/api/admin/users?${params.toString()}`);
    }),

  block: (data) =>
    apiWithRetry(() => apiPatch('/api/admin/users/block', data)),

  unblock: (data) =>
    apiWithRetry(() => apiPatch('/api/admin/users/unblock', data)),

  delete: (id) =>
    apiWithRetry(() => apiDelete(`/api/admin/users/${id}`)),
};

/**
 * 评论相关API
 */
export const commentsApi = {
  list: (filters = {}) =>
    apiWithRetry(() => {
      const params = new URLSearchParams();
      params.append('page', String(filters.page || 1));
      params.append('limit', String(filters.limit || 10));
      if (filters.search) params.append('search', filters.search);
      return apiGet(`/api/admin/comments?${params.toString()}`);
    }),

  delete: (id) =>
    apiWithRetry(() => apiDelete(`/api/admin/comments/${id}`)),

  approve: (id) =>
    apiWithRetry(() => apiPatch(`/api/admin/comments/${id}/approve`, {})),
};

/**
 * 促销相关API
 */
export const promotionsApi = {
  list: (filters = {}) =>
    apiWithRetry(() => {
      const params = new URLSearchParams();
      params.append('page', String(filters.page || 1));
      params.append('limit', String(filters.limit || 10));
      if (filters.search) params.append('search', filters.search);
      return apiGet(`/api/admin/promotions?${params.toString()}`);
    }),

  create: (data) =>
    apiWithRetry(() => apiPost('/api/admin/promotions', data)),

  update: (id, data) =>
    apiWithRetry(() => apiPatch(`/api/admin/promotions/${id}`, data)),

  delete: (id) =>
    apiWithRetry(() => apiDelete(`/api/admin/promotions/${id}`)),

  getDefaults: () =>
    apiWithRetry(() => apiGet('/api/admin/promotions/defaults')),
};

/**
 * 系列相关API
 */
export const seriesApi = {
  list: (filters = {}) =>
    apiWithRetry(() => {
      const params = new URLSearchParams();
      params.append('page', String(filters.page || 1));
      params.append('limit', String(filters.limit || 10));
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      return apiGet(`/api/admin/series?${params.toString()}`);
    }),

  get: (id) =>
    apiWithRetry(() => apiGet(`/api/admin/series/${id}`)),

  create: (data) =>
    apiWithRetry(() => apiPost('/api/admin/series', data)),

  update: (id, data) =>
    apiWithRetry(() => apiPatch(`/api/admin/series/${id}`, data)),

  delete: (id) =>
    apiWithRetry(() => apiDelete(`/api/admin/series/${id}`)),

  episodes: {
    list: (seriesId, filters = {}) =>
      apiWithRetry(() => {
        const params = new URLSearchParams();
        params.append('page', String(filters.page || 1));
        params.append('limit', String(filters.limit || 10));
        return apiGet(`/api/admin/series/${seriesId}/episodes?${params.toString()}`);
      }),

    create: (seriesId, data) =>
      apiWithRetry(() => apiPost(`/api/admin/series/${seriesId}/episodes`, data)),

    update: (seriesId, episodeId, data) =>
      apiWithRetry(() => apiPatch(`/api/admin/series/${seriesId}/episodes/${episodeId}`, data)),

    delete: (seriesId, episodeId) =>
      apiWithRetry(() => apiDelete(`/api/admin/series/${seriesId}/episodes/${episodeId}`)),
  },
};

/**
 * 账单相关API
 */
export const billingApi = {
  list: (filters = {}) =>
    apiWithRetry(() => {
      const params = new URLSearchParams();
      params.append('page', String(filters.page || 1));
      params.append('limit', String(filters.limit || 10));
      if (filters.search) params.append('search', filters.search);
      return apiGet(`/api/admin/billing?${params.toString()}`);
    }),

  create: (data) =>
    apiWithRetry(() => apiPost('/api/admin/billing', data)),

  update: (id, data) =>
    apiWithRetry(() => apiPatch(`/api/admin/billing/${id}`, data)),

  delete: (id) =>
    apiWithRetry(() => apiDelete(`/api/admin/billing/${id}`)),
};

/**
 * 通知相关API
 */
export const notificationsApi = {
  list: (filters = {}) =>
    apiWithRetry(() => {
      const params = new URLSearchParams();
      params.append('page', String(filters.page || 1));
      params.append('limit', String(filters.limit || 10));
      if (filters.search) params.append('search', filters.search);
      return apiGet(`/api/admin/notifications?${params.toString()}`);
    }),

  delete: (id) =>
    apiWithRetry(() => apiDelete(`/api/admin/notifications/${id}`)),
};

/**
 * 日志相关API
 */
export const logsApi = {
  list: (filters = {}) =>
    apiWithRetry(() => {
      const params = new URLSearchParams();
      params.append('page', String(filters.page || 1));
      params.append('limit', String(filters.limit || 10));
      if (filters.search) params.append('search', filters.search);
      if (filters.action) params.append('action', filters.action);
      return apiGet(`/api/admin/logs?${params.toString()}`);
    }),

  delete: (id) =>
    apiWithRetry(() => apiDelete(`/api/admin/logs/${id}`)),
};

/**
 * 仪表板相关API
 */
export const dashboardApi = {
  stats: (filters = {}) =>
    apiWithRetry(() => {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      return apiGet(`/api/admin/stats?${params.toString()}`);
    }),

  metrics: (filters = {}) =>
    apiWithRetry(() => {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      return apiGet(`/api/admin/metrics?${params.toString()}`);
    }),

  rankings: () =>
    apiWithRetry(() => apiGet('/api/admin/rankings')),
};

export { parseList };
