import { ApiResponse } from "./apiClient";

export interface ParallelRequestConfig<T = unknown> {
  name: string;
  request: () => Promise<ApiResponse<T>>;
}

export interface ParallelRequestResult<T = unknown> {
  name: string;
  response: ApiResponse<T>;
  error?: Error;
}

export async function parallelRequests<T = unknown>(
  configs: ParallelRequestConfig<T>[],
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

export async function parallelRequests2<T1 = unknown, T2 = unknown>(
  request1: () => Promise<ApiResponse<T1>>,
  request2: () => Promise<ApiResponse<T2>>,
): Promise<[ApiResponse<T1>, ApiResponse<T2>]> {
  const [result1, result2] = await Promise.all([request1(), request2()]);
  return [result1, result2];
}

export async function parallelRequests3<
  T1 = unknown,
  T2 = unknown,
  T3 = unknown,
>(
  request1: () => Promise<ApiResponse<T1>>,
  request2: () => Promise<ApiResponse<T2>>,
  request3: () => Promise<ApiResponse<T3>>,
): Promise<[ApiResponse<T1>, ApiResponse<T2>, ApiResponse<T3>]> {
  const [result1, result2, result3] = await Promise.all([
    request1(),
    request2(),
    request3(),
  ]);
  return [result1, result2, result3];
}
