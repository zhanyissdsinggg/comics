/**
 * NOTE: cleaned corrupted comment. */

import { apiGet } from "./apiClient";
import { trackEvent } from "./trackEvent";

const HEALTH_CHECK_INTERVAL = 30000; // 30s
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1s
class APIHealthManager {
  constructor() {
    this.isHealthy = true;
    this.lastCheckTime = 0;
    this.failureCount = 0;
    this.errorLog = [];
    this.maxErrorLogSize = 100;
  }

  /**
   * NOTE: cleaned corrupted comment. */
  async checkHealth() {
    const now = Date.now();

        // Avoid excessive health checks
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
        trackEvent("api_health_check_success");
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
   * NOTE: cleaned corrupted comment. */
  recordFailure(message, details) {
    this.failureCount += 1;

    if (this.failureCount >= 3) {
      this.isHealthy = false;
      trackEvent("api_health_degraded", { failureCount: this.failureCount });
    }

    const errorEntry = {
      timestamp: new Date().toISOString(),
      message,
      details,
      failureCount: this.failureCount,
    };

    this.errorLog.push(errorEntry);

        // Keep a bounded error log
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }

    console.error("[API Health]", message, details);
  }

  /**
   * NOTE: cleaned corrupted comment. */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * NOTE: cleaned corrupted comment. */
  reset() {
    this.isHealthy = true;
    this.failureCount = 0;
    this.errorLog = [];
  }
}

/**
 * NOTE: cleaned corrupted comment. */
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

            // Do not retry 4xx errors
      if (result.status >= 400 && result.status < 500) {
        return result;
      }

      lastError = new Error(`HTTP ${result.status}`);
    } catch (error) {
      lastError = error;
    }

        // Backoff between retries
    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      trackEvent("api_retry_attempt", { attempt: attempt + 1, maxRetries });
    }
  }

    // All retries exhausted
  trackEvent("api_retry_exhausted", { maxRetries });
  throw lastError;
}

/**
 * NOTE: cleaned corrupted comment. */
export function getAPIFallbackData(endpoint) {
  // NOTE: cleaned corrupted comment.
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


// API health singleton
export const apiHealthManager = new APIHealthManager();
