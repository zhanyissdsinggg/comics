/**
 * React Query配置和Provider
 * 这个SB文件管理所有的数据缓存和同步
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useMemo } from 'react';

/**
 * 创建QueryClient实例
 * 配置缓存策略和重试机制
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 数据缓存5分钟
        staleTime: 5 * 60 * 1000,
        // 后台重新获取数据的间隔
        refetchInterval: 10 * 60 * 1000,
        // 窗口获得焦点时重新获取
        refetchOnWindowFocus: true,
        // 重新连接时重新获取
        refetchOnReconnect: true,
        // 挂载时重新获取
        refetchOnMount: true,
        // 重试次数
        retry: 3,
        // 重试延迟（指数退避）
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        // mutation重试次数
        retry: 1,
        // mutation重试延迟
        retryDelay: 1000,
      },
    },
  });
}

let clientSingleton;

/**
 * 获取或创建QueryClient单例
 */
function getQueryClient() {
  if (!clientSingleton) {
    clientSingleton = createQueryClient();
  }
  return clientSingleton;
}

/**
 * React Query Provider组件
 */
export function QueryProvider({ children }) {
  const queryClient = useMemo(() => getQueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
