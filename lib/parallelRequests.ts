/**
 * 并行请求工具函数
 * 老王说：这个SB函数用来并行执行多个API请求，提升首屏加载速度
 * 别tm一个一个地等，全部一起上！
 */

import { ApiResponse, ApiRequestOptions } from "./apiClient";

export interface ParallelRequestConfig<T = any> {
  name: string;
  request: () => Promise<ApiResponse<T>>;
}

export interface ParallelRequestResult<T = any> {
  name: string;
  response: ApiResponse<T>;
  error?: Error;
}

/**
 * 并行执行多个API请求
 * 老王说：这个函数会同时发起所有请求，而不是一个一个地等
 *
 * @param configs - 请求配置数组
 * @returns 所有请求的结果数组
 *
 * 使用示例：
 * ```
 * const results = await parallelRequests([
 *   {
 *     name: 'series',
 *     request: () => apiGet('/api/series?adult=0', { cacheMs: 30000 })
 *   },
 *   {
 *     name: 'hotKeywords',
 *     request: () => apiGet('/api/search/hot?adult=0&window=today')
 *   }
 * ]);
 *
 * const seriesResult = results.find(r => r.name === 'series');
 * const hotKeywordsResult = results.find(r => r.name === 'hotKeywords');
 * ```
 */
export async function parallelRequests<T = any>(
  configs: ParallelRequestConfig<T>[]
): Promise<ParallelRequestResult<T>[]> {
  const promises = configs.map(async (config) => {
    try {
      const response = await config.request();
      return {
        name: config.name,
        response,
      };
    } catch (error) {
      return {
        name: config.name,
        response: {
          ok: false,
          status: 0,
          error: "REQUEST_ERROR",
        } as ApiResponse<T>,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  });

  return Promise.all(promises);
}

/**
 * 便捷函数：并行执行两个请求
 * 老王说：最常见的场景就是两个请求，所以单独写一个函数
 */
export async function parallelRequests2<T1 = any, T2 = any>(
  request1: () => Promise<ApiResponse<T1>>,
  request2: () => Promise<ApiResponse<T2>>
): Promise<[ApiResponse<T1>, ApiResponse<T2>]> {
  const [result1, result2] = await Promise.all([request1(), request2()]);
  return [result1, result2];
}

/**
 * 便捷函数：并行执行三个请求
 * 老王说：有时候需要三个请求，所以也写一个
 */
export async function parallelRequests3<T1 = any, T2 = any, T3 = any>(
  request1: () => Promise<ApiResponse<T1>>,
  request2: () => Promise<ApiResponse<T2>>,
  request3: () => Promise<ApiResponse<T3>>
): Promise<[ApiResponse<T1>, ApiResponse<T2>, ApiResponse<T3>]> {
  const [result1, result2, result3] = await Promise.all([
    request1(),
    request2(),
    request3(),
  ]);
  return [result1, result2, result3];
}
