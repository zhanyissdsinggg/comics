const STORAGE_KEYS = {
  ACCESS_TOKEN: "admin_access_token",
  REFRESH_TOKEN: "admin_refresh_token",
  TOKEN_EXPIRY: "admin_token_expiry",
};

const encodeToken = (token) => {
  if (typeof window === "undefined") {
    return token;
  }
  return btoa(JSON.stringify({ token, timestamp: Date.now() }));
};

const decodeToken = (encoded) => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const decoded = JSON.parse(atob(encoded));
    if (Date.now() - decoded.timestamp > 24 * 60 * 60 * 1000) {
      return null;
    }
    return decoded.token;
  } catch {
    return null;
  }
};

export const tokenStorage = {
  setTokens: (accessToken, refreshToken, expiresIn = 3600) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const expiryTime = Date.now() + expiresIn * 1000;
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, encodeToken(accessToken));
      sessionStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(expiryTime));
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, encodeToken(refreshToken));
    } catch (err) {
      console.error("failed to persist auth tokens", err);
    }
  },

  getAccessToken: () => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const token = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const expiry = sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      if (!token || !expiry) {
        return null;
      }
      if (Date.now() > Number.parseInt(expiry, 10)) {
        tokenStorage.clearTokens();
        return null;
      }
      return decodeToken(token);
    } catch (err) {
      console.error("failed to read access token", err);
      return null;
    }
  },

  getRefreshToken: () => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const token = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      return token ? decodeToken(token) : null;
    } catch (err) {
      console.error("failed to read refresh token", err);
      return null;
    }
  },

  clearTokens: () => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (err) {
      console.error("failed to clear auth tokens", err);
    }
  },

  isTokenExpiringSoon: () => {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      const expiry = sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      if (!expiry) {
        return false;
      }
      const timeUntilExpiry = Number.parseInt(expiry, 10) - Date.now();
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch {
      return false;
    }
  },

  getTokenTimeRemaining: () => {
    if (typeof window === "undefined") {
      return 0;
    }
    try {
      const expiry = sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      if (!expiry) {
        return 0;
      }
      return Math.max(0, Number.parseInt(expiry, 10) - Date.now());
    } catch {
      return 0;
    }
  },
};

export class TokenRefreshManager {
  constructor(onRefresh, onRefreshFailed) {
    this.onRefresh = onRefresh;
    this.onRefreshFailed = onRefreshFailed;
    this.refreshTimer = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  start() {
    this.scheduleRefresh();
  }

  stop() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  scheduleRefresh() {
    this.stop();
    const timeRemaining = tokenStorage.getTokenTimeRemaining();
    if (timeRemaining <= 0) {
      this.onRefreshFailed?.("token expired");
      return;
    }
    const refreshTime = Math.max(0, timeRemaining - 5 * 60 * 1000);
    this.refreshTimer = setTimeout(() => {
      this.refresh();
    }, refreshTime);
  }

  async refresh() {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        this.onRefreshFailed?.("missing refresh token");
        return;
      }

      const response = await fetch("/api/admin/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error(`refresh failed: ${response.status}`);
      }

      const data = await response.json();
      tokenStorage.setTokens(data.accessToken, data.refreshToken, data.expiresIn);
      this.retryCount = 0;
      this.onRefresh?.(data.accessToken);
      this.scheduleRefresh();
    } catch (err) {
      console.error("token refresh failed", err);
      this.retryCount += 1;
      if (this.retryCount >= this.maxRetries) {
        this.onRefreshFailed?.(err?.message || "refresh failed");
        return;
      }
      const retryDelay = Math.pow(2, this.retryCount) * 1000;
      this.refreshTimer = setTimeout(() => {
        this.refresh();
      }, retryDelay);
    }
  }

  refreshNow() {
    this.stop();
    this.refresh();
  }
}
