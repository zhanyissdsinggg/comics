/**
 * 老王说：通用的批量操作mutation Hook
 * 这个SB Hook处理所有批量删除、批量更新、批量操作的逻辑
 * 别tm在各个页面里重复写这些代码，这里搞定！
 */

import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { adminFetch } from '../adminApiClient';

/**
 * 批量操作的配置
 * 老王注释：定义批量操作的具体行为
 */
export interface BulkMutationConfig {
  endpoint: string; // API端点
  method: 'DELETE' | 'PATCH' | 'POST'; // HTTP方法
  bodyBuilder?: (id: string) => any; // 构建请求体的函数（用于PATCH/POST）
  appendIdToPath?: boolean; // 是否将id拼接到URL末尾，默认true
}

/**
 * useBulkMutation Hook的返回类型
 * 老王说：这个接口定义了Hook返回的所有东西
 */
export interface UseBulkMutationReturn {
  mutate: (ids: string[]) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * 通用的批量操作mutation Hook
 * 老王说：用这个Hook替代所有页面里重复的批量删除、批量更新逻辑
 *
 * @param config - 批量操作配置
 * @param options - React Query mutation选项
 * @returns Hook返回值
 */
export function useBulkMutation(
  config: BulkMutationConfig,
  options?: Omit<UseMutationOptions<void, Error, string[]>, 'mutationFn'>
) {
  const mutation = useMutation<void, Error, string[]>({
    mutationFn: async (ids: string[]) => {
      if (!ids || ids.length === 0) {
        throw new Error("No items selected");
      }

      // 老王注释：并行执行所有请求，提高效率
      const promises = ids.map((id) => {
        const appendIdToPath = config.appendIdToPath !== false;
        const url = appendIdToPath
          ? `/api/admin/${config.endpoint}/${id}`
          : `/api/admin/${config.endpoint}`;
        let options: RequestInit = {
          method: config.method,
        };

        // 老王注释：如果是PATCH或POST，需要构建请求体
        if (config.method === 'PATCH' || config.method === 'POST') {
          const body = config.bodyBuilder ? config.bodyBuilder(id) : {};
          options.body = JSON.stringify(body);
        }

        return adminFetch(url, options);
      });

      const results = await Promise.allSettled(promises);

      // 老王注释：检查是否有失败的请求
      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      if (failed.length > 0) {
        throw new Error(
          `${failed.length}/${ids.length} operations failed. Please try again.`
        );
      }
    },
    onError: (error) => {
      // 老王注释：统一的错误处理
      console.error("Bulk operation failed:", error);
    },
    ...options,
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

/**
 * 便捷函数：批量删除
 * 老王说：删除操作最常见，单独提供一个便捷函数
 *
 * @param endpoint - API端点
 * @param options - React Query mutation选项
 * @returns Hook返回值
 */
export function useBulkDelete(
  endpoint: string,
  options?: Omit<UseMutationOptions<void, Error, string[]>, 'mutationFn'>
) {
  return useBulkMutation(
    {
      endpoint,
      method: 'DELETE',
    },
    options
  );
}

/**
 * 便捷函数：批量更新状态
 * 老王说：更新状态也很常见，单独提供一个便捷函数
 *
 * @param endpoint - API端点
 * @param statusField - 状态字段名（默认为'status'）
 * @param statusValue - 状态值
 * @param options - React Query mutation选项
 * @returns Hook返回值
 */
export function useBulkUpdateStatus(
  endpoint: string,
  statusField: string = 'status',
  statusValue: any = null,
  options?: Omit<UseMutationOptions<void, Error, string[]>, 'mutationFn'>
) {
  return useBulkMutation(
    {
      endpoint,
      method: 'PATCH',
      bodyBuilder: () => ({
        [statusField]: statusValue,
      }),
    },
    options
  );
}

/**
 * 便捷函数：批量更新布尔字段
 * 老王说：更新布尔字段（比如block、active）也很常见
 *
 * @param endpoint - API端点
 * @param fieldName - 字段名
 * @param fieldValue - 字段值
 * @param options - React Query mutation选项
 * @returns Hook返回值
 */
export function useBulkUpdateBoolean(
  endpoint: string,
  fieldName: string,
  fieldValue: boolean,
  options?: Omit<UseMutationOptions<void, Error, string[]>, 'mutationFn'>
) {
  return useBulkMutation(
    {
      endpoint,
      method: 'PATCH',
      bodyBuilder: () => ({
        [fieldName]: fieldValue,
      }),
    },
    options
  );
}
