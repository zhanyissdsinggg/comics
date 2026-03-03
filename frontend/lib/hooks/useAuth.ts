/**
 * 老王说：认证状态管理Hook
 * 统一管理用户认证状态，防止状态不一致
 */

import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../apiClient';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  isBlocked?: boolean;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * 老王说：获取当前认证用户信息
 * 使用此hook替代所有地方的手动认证检查
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiGet<AuthUser>('/api/auth/me', {
        suppressAuthModal: true,
      });

      if (response.ok && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
        if (response.status !== 401) {
          setError(response.error || 'Failed to fetch user');
        }
      }
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiGet('/api/auth/logout');
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch: fetchUser,
    logout,
  };
}
