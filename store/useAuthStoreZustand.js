/**
 * 使用Zustand重构的AuthStore
 * 性能优势：
 * 1. 选择性订阅 - 只订阅需要的状态
 * 2. 自动优化 - 减少不必要的重新渲染
 * 3. 更简洁的API
 */

import { create } from 'zustand';
import { apiGet, apiPost } from '../lib/apiClient';
import { setCookie } from '../lib/cookies';

export const useAuthStoreZustand = create((set, get) => ({
  // 状态
  isSignedIn: false,
  user: null,
  hydrated: false,
  loading: false,
  error: null,

  // 初始化
  initialize: async () => {
    if (typeof window === 'undefined') {
      return;
    }

    set({ loading: true });

    try {
      const response = await apiGet('/api/auth/me');
      if (response.ok) {
        set({
          isSignedIn: true,
          user: response.data?.user || null,
          hydrated: true,
          loading: false,
        });
      } else {
        set({
          isSignedIn: false,
          user: null,
          hydrated: true,
          loading: false,
        });
      }
    } catch (error) {
      set({
        isSignedIn: false,
        user: null,
        hydrated: true,
        loading: false,
        error: error.message,
      });
    }
  },

  // 登录
  login: async (email, password) => {
    set({ loading: true, error: null });

    try {
      const response = await apiPost('/api/auth/login', { email, password });
      if (response.ok) {
        set({
          isSignedIn: true,
          user: response.data?.user || null,
          loading: false,
        });
        setCookie('mn_is_signed_in', '1');
      } else {
        set({
          loading: false,
          error: response.error || 'Login failed',
        });
      }
      return response;
    } catch (error) {
      set({
        loading: false,
        error: error.message,
      });
      return { ok: false, error: error.message };
    }
  },

  // 注册
  register: async (email, password) => {
    set({ loading: true, error: null });

    try {
      const response = await apiPost('/api/auth/register', { email, password });
      if (response.ok) {
        set({
          isSignedIn: true,
          user: response.data?.user || null,
          loading: false,
        });
        setCookie('mn_is_signed_in', '1');
      } else {
        set({
          loading: false,
          error: response.error || 'Registration failed',
        });
      }
      return response;
    } catch (error) {
      set({
        loading: false,
        error: error.message,
      });
      return { ok: false, error: error.message };
    }
  },

  // 登出
  signOut: async () => {
    set({ loading: true });

    try {
      await apiPost('/api/auth/logout');
      set({
        isSignedIn: false,
        user: null,
        loading: false,
      });
      setCookie('mn_is_signed_in', '0');
    } catch (error) {
      set({
        loading: false,
        error: error.message,
      });
    }
  },

  // 通用登录/注册方法
  signIn: async (email, password, mode = 'login') => {
    const { login, register } = get();
    if (mode === 'register') {
      return register(email, password);
    }
    return login(email, password);
  },

  // 清除错误
  clearError: () => set({ error: null }),
}));

/**
 * 使用示例：
 *
 * // 只订阅isSignedIn
 * const isSignedIn = useAuthStoreZustand(state => state.isSignedIn);
 *
 * // 只订阅user
 * const user = useAuthStoreZustand(state => state.user);
 *
 * // 订阅多个状态
 * const { isSignedIn, user } = useAuthStoreZustand(state => ({
 *   isSignedIn: state.isSignedIn,
 *   user: state.user,
 * }));
 *
 * // 使用actions
 * const login = useAuthStoreZustand(state => state.login);
 * const signOut = useAuthStoreZustand(state => state.signOut);
 */
