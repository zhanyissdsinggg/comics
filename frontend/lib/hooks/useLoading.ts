/**
 * 老王说：加载状态管理Hook
 * 统一管理组件的加载状态，防止状态混乱
 */

import { useState, useCallback } from 'react';

export interface UseLoadingReturn {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  setLoading: (loading: boolean) => void;
  withLoading: <T,>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * 老王说：管理异步操作的加载状态
 * 使用此hook替代所有地方的手动loading状态管理
 */
export function useLoading(initialState = false): UseLoadingReturn {
  const [isLoading, setIsLoading] = useState(initialState);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const withLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      startLoading();
      return await fn();
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    startLoading,
    stopLoading,
    setLoading,
    withLoading,
  };
}
