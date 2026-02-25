/**
 * 安全的Token存储和管理模块
 * 使用加密存储和更安全的token管理策略
 */

// 简单的Base64编码/解码（生产环境应使用真正的加密库如crypto-js）
const encodeToken = (token) => {
  if (typeof window === 'undefined') return token;
  return btoa(JSON.stringify({ token, timestamp: Date.now() }));
};

const decodeToken = (encoded) => {
  if (typeof window === 'undefined') return null;
  try {
    const decoded = JSON.parse(atob(encoded));
    // 检查token是否过期（24小时）
    if (Date.now() - decoded.timestamp > 24 * 60 * 60 * 1000) {
      return null;
    }
    return decoded.token;
  } catch (err) {
    return null;
  }
};

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'admin_access_token',
  REFRESH_TOKEN: 'admin_refresh_token',
  TOKEN_EXPIRY: 'admin_token_expiry',
};

/**
 * 安全的Token存储
 */
export const tokenStorage = {
  /**
   * 保存token
   */
  setTokens: (accessToken, refreshToken, expiresIn = 3600) => {
    if (typeof window === 'undefined') return;

    try {
      const expiryTime = Date.now() + expiresIn * 1000;

      // 使用sessionStorage存储accessToken（更安全，浏览器关闭时清除）
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, encodeToken(accessToken));
      sessionStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(expiryTime));

      // 使用localStorage存储refreshToken（需要持久化）
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, encodeToken(refreshToken));
    } catch (err) {
      console.error('保存token失败:', err);
    }
  },

  /**
   * 获取accessToken
   */
  getAccessToken: () => {
    if (typeof window === 'undefined') return null;

    try {
      const token = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const expiry = sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

      if (!token || !expiry) return null;

      // 检查token是否过期
      if (Date.now() > parseInt(expiry)) {
        tokenStorage.clearTokens();
        return null;
      }

      return decodeToken(token);
    } catch (err) {
      console.error('获取accessToken失败:', err);
      return null;
    }
  },

  /**
   * 获取refreshToken
   */
  getRefreshToken: () => {
    if (typeof window === 'undefined') return null;

    try {
      const token = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      return token ? decodeToken(token) : null;
    } catch (err) {
      console.error('获取refreshToken失败:', err);
      return null;
    }
  },

  /**
   * 清除所有token
   */
  clearTokens: () => {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (err) {
      console.error('清除token失败:', err);
    }
  },

  /**
   * 检查token是否即将过期（5分钟内）
   */
  isTokenExpiringSoon: () => {
    if (typeof window === 'undefined') return false;

    try {
      const expiry = sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      if (!expiry) return false;

      const expiryTime = parseInt(expiry);
      const timeUntilExpiry = expiryTime - Date.now();

      // 如果5分钟内过期，返回true
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch (err) {
      return false;
    }
  },

  /**
   * 获取token剩余时间（毫秒）
   */
  getTokenTimeRemaining: () => {
    if (typeof window === 'undefined') return 0;

    try {
      const expiry = sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      if (!expiry) return 0;

      const expiryTime = parseInt(expiry);
      const remaining = expiryTime - Date.now();

      return Math.max(0, remaining);
    } catch (err) {
      return 0;
    }
  },
};

/**
 * Token刷新管理器
 */
export class TokenRefreshManager {
  constructor(onRefresh, onRefreshFailed) {
    this.onRefresh = onRefresh;
    this.onRefreshFailed = onRefreshFailed;
    this.refreshTimer = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * 启动自动刷新
   */
  start() {
    this.scheduleRefresh();
  }

  /**
   * 停止自动刷新
   */
  stop() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 计划下一次刷新
   */
  scheduleRefresh() {
    this.stop();

    const timeRemaining = tokenStorage.getTokenTimeRemaining();

    if (timeRemaining <= 0) {
      // Token已过期
      this.onRefreshFailed?.('Token已过期');
      return;
    }

    // 在token过期前5分钟刷新
    const refreshTime = Math.max(0, timeRemaining - 5 * 60 * 1000);

    this.refreshTimer = setTimeout(() => {
      this.refresh();
    }, refreshTime);
  }

  /**
   * 执行刷新
   */
  async refresh() {
    try {
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        this.onRefreshFailed?.('没有refreshToken');
        return;
      }

      const response = await fetch('/api/admin/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error(`刷新失败: ${response.status}`);
      }

      const data = await response.json();

      // 保存新的token
      tokenStorage.setTokens(data.accessToken, data.refreshToken, data.expiresIn);

      // 重置重试计数
      this.retryCount = 0;

      // 触发刷新成功回调
      this.onRefresh?.(data.accessToken);

      // 计划下一次刷新
      this.scheduleRefresh();
    } catch (err) {
      console.error('Token刷新失败:', err);

      this.retryCount++;

      if (this.retryCount >= this.maxRetries) {
        // 重试次数过多，触发失败回调
        this.onRefreshFailed?.(err.message);
      } else {
        // 指数退避重试
        const retryDelay = Math.pow(2, this.retryCount) * 1000;
        this.refreshTimer = setTimeout(() => {
          this.refresh();
        }, retryDelay);
      }
    }
  }

  /**
   * 立即刷新
   */
  refreshNow() {
    this.stop();
    this.refresh();
  }
}
