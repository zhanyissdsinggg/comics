/**
 * 使用Zustand重构的WalletStore
 * 性能优势：选择性订阅，减少不必要的渲染
 */

import { create } from 'zustand';
import { apiDelete, apiGet, apiPost } from '../lib/apiClient';
import { track } from '../lib/analytics';

const defaultWallet = {
  paidPts: 0,
  bonusPts: 0,
  plan: 'free',
  subscription: null,
  subscriptionUsage: null,
  subscriptionVoucher: null,
};

export const useWalletStoreZustand = create((set, get) => ({
  // 状态
  ...defaultWallet,
  loading: false,
  error: null,
  inflightRequests: new Map(),

  // 加载钱包数据
  loadWallet: async (isSignedIn) => {
    if (!isSignedIn) {
      return { ok: false, status: 401, error: 'UNAUTHENTICATED' };
    }

    set({ loading: true, error: null });

    try {
      const response = await apiGet('/api/wallet');
      if (response.ok && response.data?.wallet) {
        set({
          ...response.data.wallet,
          loading: false,
        });
      } else {
        set({ loading: false, error: response.error });
      }
      return response;
    } catch (error) {
      set({ loading: false, error: error.message });
      return { ok: false, error: error.message };
    }
  },

  // 订阅
  subscribe: async (planId) => {
    const { loadWallet } = get();

    track('subscribe_start', { planId });
    set({ loading: true, error: null });

    try {
      const response = await apiPost('/api/subscription', { planId });
      if (response.ok && response.data?.subscription) {
        set((state) => ({
          subscription: response.data.subscription,
          plan: planId,
          loading: false,
        }));
        await loadWallet(true);
        track('subscribe_success', { planId });
      } else {
        set({ loading: false, error: response.error });
        track('subscribe_fail', {
          planId,
          status: response.status,
          errorCode: response.error,
        });
      }
      return response;
    } catch (error) {
      set({ loading: false, error: error.message });
      track('subscribe_fail', { planId, errorCode: error.message });
      return { ok: false, error: error.message };
    }
  },

  // 取消订阅
  cancelSubscription: async () => {
    set({ loading: true, error: null });

    try {
      const response = await apiDelete('/api/subscription');
      if (response.ok) {
        set((state) => ({
          subscription: response.data?.subscription || null,
          plan: 'free',
          loading: false,
        }));
        track('subscribe_cancel', {});
      } else {
        set({ loading: false, error: response.error });
      }
      return response;
    } catch (error) {
      set({ loading: false, error: error.message });
      return { ok: false, error: error.message };
    }
  },

  // 充值（带防重复请求）
  topup: async (packageId, isSignedIn) => {
    if (!isSignedIn) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:open'));
      }
      return { ok: false, status: 401, error: 'UNAUTHENTICATED' };
    }

    const { inflightRequests } = get();
    const key = `topup:${packageId}`;

    // 防止重复请求
    if (inflightRequests.has(key)) {
      return inflightRequests.get(key);
    }

    track('topup_start', { packageId });
    set({ loading: true, error: null });

    const requestPromise = (async () => {
      try {
        const created = await apiPost('/api/payments/create', {
          packageId,
          provider: 'stripe',
        });

        if (!created.ok) {
          track('topup_fail', {
            packageId,
            status: created.status,
            errorCode: created.error,
            requestId: created.requestId,
          });
          set({ loading: false, error: created.error });
          return created;
        }

        const confirm = await apiPost('/api/payments/confirm', {
          paymentId: created.data?.payment?.paymentId,
        });

        if (!confirm.ok) {
          track('topup_fail', {
            packageId,
            status: confirm.status,
            errorCode: confirm.error,
            requestId: confirm.requestId,
          });
          set({ loading: false, error: confirm.error });
          return confirm;
        }

        if (confirm.data?.wallet) {
          set({
            ...confirm.data.wallet,
            loading: false,
          });
        }

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('mn_has_purchased', '1');
        }

        track('topup_success', { packageId });
        return confirm;
      } catch (error) {
        set({ loading: false, error: error.message });
        track('topup_fail', { packageId, errorCode: error.message });
        return { ok: false, error: error.message };
      } finally {
        // 清理inflight请求
        set((state) => {
          const newInflight = new Map(state.inflightRequests);
          newInflight.delete(key);
          return { inflightRequests: newInflight };
        });
      }
    })();

    // 记录inflight请求
    set((state) => {
      const newInflight = new Map(state.inflightRequests);
      newInflight.set(key, requestPromise);
      return { inflightRequests: newInflight };
    });

    return requestPromise;
  },

  // 更新钱包状态
  setWallet: (wallet) => set(wallet),

  // 清除错误
  clearError: () => set({ error: null }),
}));

/**
 * 使用示例：
 *
 * // 只订阅paidPts和bonusPts
 * const { paidPts, bonusPts } = useWalletStoreZustand(state => ({
 *   paidPts: state.paidPts,
 *   bonusPts: state.bonusPts,
 * }));
 *
 * // 只订阅plan
 * const plan = useWalletStoreZustand(state => state.plan);
 *
 * // 使用actions
 * const loadWallet = useWalletStoreZustand(state => state.loadWallet);
 * const topup = useWalletStoreZustand(state => state.topup);
 */
