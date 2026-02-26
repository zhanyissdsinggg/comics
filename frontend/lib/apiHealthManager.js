/**
 * 老王注释：API健康检查和错误恢复机制
 * 这个SB文件用来检测后端API是否正常运行，并提供自动恢复机制
 * 职责：
 * - 定期检查后端API健康状态
 * - 记录API错误日志
 * - 提供降级方案（缓存数据、本地数据等）
 * - 自动重试失败的请求
 */

import { apiGet } from "./apiClient";
import { track } from "./analytics";

const HEALTH_CHECK_INTERVAL = 30000; // 30秒检查一次
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

class APIHealthManager {
  constructor() {
    this.isHealthy = true;
    this.lastCheckTime = 0;
    this.failureCount = 0;
    this.errorLog = [];
    this.maxErrorLogSize = 100;
  }

  /**
   * 老王注释：检查后端API健康状态
   * 这个SB函数会定期检查后端是否还活着
   */
  async checkHealth() {
    const now = Date.now();

    // 避免频繁检查
    if (now - this.lastCheckTime < HEALTH_CHECK_INTERVAL) {
      return this.isHealthy;
    }

    this.lastCheckTime = now;

    try {
      const response = await apiGet("/api/health", {
        suppressAuthModal: true,
        timeoutMs: 5000,
      });

      if (response.ok) {
        this.isHealthy = true;
        this.failureCount = 0;
        track("api_health_check_success");
        return true;
      } else {
        this.recordFailure("Health check failed", response.status);
        return false;
      }
    } catch (error) {
      this.recordFailure("Health check error", error.message);
      return false;
    }
  }

  /**
   * 老王注释：记录API错误
   * 这个SB函数用来记录所有API错误，方便调试
   */
  recordFailure(message, details) {
    this.failureCount += 1;

    if (this.failureCount >= 3) {
      this.isHealthy = false;
      track("api_health_degraded", { failureCount: this.failureCount });
    }

    const errorEntry = {
      timestamp: new Date().toISOString(),
      message,
      details,
      failureCount: this.failureCount,
    };

    this.errorLog.push(errorEntry);

    // 限制错误日志大小
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }

    console.error("[API Health]", message, details);
  }

  /**
   * 老王注释：获取错误日志
   * 这个SB函数用来获取最近的错误日志，方便调试
   */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * 老王注释：重置健康状态
   * 这个SB函数用来重置健康状态，当后端恢复时调用
   */
  reset() {
    this.isHealthy = true;
    this.failureCount = 0;
    this.errorLog = [];
  }
}

/**
 * 老王注释：API重试机制
 * 这个SB函数用来自动重试失败的API请求
 */
export async function apiWithRetry(
  apiFunction,
  maxRetries = MAX_RETRIES,
  retryDelay = RETRY_DELAY
) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await apiFunction();

      if (result.ok) {
        return result;
      }

      // 如果是4xx错误，不需要重试
      if (result.status >= 400 && result.status < 500) {
        return result;
      }

      lastError = new Error(`HTTP ${result.status}`);
    } catch (error) {
      lastError = error;
    }

    // 如果不是最后一次尝试，等待后重试
    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      track("api_retry_attempt", { attempt: attempt + 1, maxRetries });
    }
  }

  // 所有重试都失败了
  track("api_retry_exhausted", { maxRetries });
  throw lastError;
}

/**
 * 老王注释：API降级方案
 * 这个SB函数用来在后端不可用时提供降级方案
 */
export function getAPIFallbackData(endpoint) {
  // 这里可以返回缓存的数据或本地数据
  const fallbackMap = {
    "/api/wallet": {
      ok: true,
      data: {
        paidPts: 0,
        bonusPts: 0,
        plan: null,
      },
    },
    "/api/entitlements": {
      ok: true,
      data: {
        entitlements: [],
      },
    },
    "/api/coupons": {
      ok: true,
      data: {
        coupons: [],
      },
    },
  };

  return fallbackMap[endpoint] || null;
}

// 导出单例
export const apiHealthManager = new APIHealthManager();
