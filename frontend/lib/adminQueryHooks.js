/**
 * Admin数据查询Hooks
 * 使用React Query管理所有admin相关的数据获取和缓存
 * 这个SB文件让数据管理变得简单优雅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, usersApi, commentsApi, promotionsApi, seriesApi, billingApi, notificationsApi, logsApi, dashboardApi } from './adminApiClient';

/**
 * 订单查询Hooks
 */
export function useOrdersList(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: () => ordersApi.list(filters),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}

export function useOrdersRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => ordersApi.refund(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}

export function useOrdersAdjust() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => ordersApi.adjust(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}

export function useOrdersDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => ordersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}

/**
 * 用户查询Hooks
 */
export function useUsersList(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => usersApi.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUsersBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => usersApi.block(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useUsersUnblock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => usersApi.unblock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useUsersDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

/**
 * 评论查询Hooks
 */
export function useCommentsList(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'comments', filters],
    queryFn: () => commentsApi.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCommentsDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => commentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
  });
}

export function useCommentsApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => commentsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
  });
}

/**
 * 促销查询Hooks
 */
export function usePromotionsList(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'promotions', filters],
    queryFn: () => promotionsApi.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePromotionsCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => promotionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });
    },
  });
}

export function usePromotionsUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => promotionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });
    },
  });
}

export function usePromotionsDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => promotionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });
    },
  });
}

export function usePromotionsDefaults() {
  return useQuery({
    queryKey: ['admin', 'promotions', 'defaults'],
    queryFn: () => promotionsApi.getDefaults(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 系列查询Hooks
 */
export function useSeriesList(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'series', filters],
    queryFn: () => seriesApi.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSeriesGet(id) {
  return useQuery({
    queryKey: ['admin', 'series', id],
    queryFn: () => seriesApi.get(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useSeriesCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => seriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'series'] });
    },
  });
}

export function useSeriesUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => seriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'series'] });
    },
  });
}

export function useSeriesDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => seriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'series'] });
    },
  });
}

/**
 * 账单查询Hooks
 */
export function useBillingList(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'billing', filters],
    queryFn: () => billingApi.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBillingCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => billingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing'] });
    },
  });
}

export function useBillingUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => billingApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing'] });
    },
  });
}

export function useBillingDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => billingApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing'] });
    },
  });
}

/**
 * 通知查询Hooks
 */
export function useNotificationsList(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'notifications', filters],
    queryFn: () => notificationsApi.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNotificationsDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });
}

/**
 * 日志查询Hooks
 */
export function useLogsList(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'logs', filters],
    queryFn: () => logsApi.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogsDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => logsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] });
    },
  });
}

/**
 * 仪表板查询Hooks
 */
export function useDashboardStats(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'stats', filters],
    queryFn: () => dashboardApi.stats(filters),
    staleTime: 10 * 60 * 1000,
  });
}

export function useDashboardMetrics(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'metrics', filters],
    queryFn: () => dashboardApi.metrics(filters),
    staleTime: 10 * 60 * 1000,
  });
}

export function useDashboardRankings() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'rankings'],
    queryFn: () => dashboardApi.rankings(),
    staleTime: 10 * 60 * 1000,
  });
}
