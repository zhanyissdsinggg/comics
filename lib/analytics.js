import { emitEvent } from "./eventBus";
import { apiPost } from "./apiClient";

// ============================================
// Analytics Event Queue with Batch Sending
// ============================================

const EVENT_QUEUE = [];
const BATCH_SIZE = 10; // Send when queue reaches 10 events
const BATCH_INTERVAL_MS = 5000; // Or send every 5 seconds
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 1000;

// 老王添加：Circuit Breaker配置
const CIRCUIT_BREAKER_THRESHOLD = 5; // 连续失败5次后打开熔断器
const CIRCUIT_BREAKER_TIMEOUT_MS = 60000; // 熔断器打开后60秒才尝试恢复
const CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 2; // 半开状态下连续成功2次才关闭熔断器

let batchTimer = null;
let retryCount = 0;
let lastFailureTime = 0;
let isProcessing = false;

// 老王添加：Circuit Breaker状态
let circuitBreakerState = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
let consecutiveFailures = 0;
let consecutiveSuccesses = 0;
let circuitBreakerOpenTime = 0;

function getClientContext() {
  if (typeof window === "undefined") {
    return {};
  }
  const path = window.location?.pathname || "";
  const referrer = document?.referrer || "";
  const userId =
    window.localStorage?.getItem("mn_user_id") ||
    window.localStorage?.getItem("mn_userId") ||
    "";
  return { path, referrer, userId };
}

/**
 * Check if user is authenticated
 * Returns true if user has a valid session/token
 */
function isAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }
  // Check for auth token or user ID
  const hasToken = !!window.localStorage?.getItem("mn_auth_token");
  const hasUserId = !!window.localStorage?.getItem("mn_user_id");
  return hasToken || hasUserId;
}

/**
 * Calculate backoff delay using exponential backoff
 */
function getBackoffDelay() {
  return Math.min(INITIAL_BACKOFF_MS * Math.pow(2, retryCount), 30000);
}

/**
 * Check if we should skip sending due to recent failures
 */
function shouldSkipDueToBackoff() {
  if (retryCount === 0) {
    return false;
  }
  const backoffDelay = getBackoffDelay();
  const timeSinceFailure = Date.now() - lastFailureTime;
  return timeSinceFailure < backoffDelay;
}

/**
 * 老王添加：Circuit Breaker检查
 * 检查熔断器状态，决定是否允许发送请求
 */
function checkCircuitBreaker() {
  const now = Date.now();

  switch (circuitBreakerState) {
    case "OPEN":
      // 熔断器打开状态：检查是否可以进入半开状态
      if (now - circuitBreakerOpenTime >= CIRCUIT_BREAKER_TIMEOUT_MS) {
        console.log("[analytics] Circuit breaker entering HALF_OPEN state");
        circuitBreakerState = "HALF_OPEN";
        consecutiveSuccesses = 0;
        return true; // 允许尝试一次请求
      }
      console.log("[analytics] Circuit breaker is OPEN, skipping request");
      return false; // 熔断器打开，拒绝请求

    case "HALF_OPEN":
      // 半开状态：允许请求通过，但会根据结果决定下一步
      return true;

    case "CLOSED":
    default:
      // 熔断器关闭状态：正常允许请求
      return true;
  }
}

/**
 * 老王添加：记录请求成功
 * 更新熔断器状态
 */
function recordSuccess() {
  consecutiveFailures = 0;
  retryCount = 0;

  if (circuitBreakerState === "HALF_OPEN") {
    consecutiveSuccesses++;
    if (consecutiveSuccesses >= CIRCUIT_BREAKER_SUCCESS_THRESHOLD) {
      console.log("[analytics] Circuit breaker closing after successful requests");
      circuitBreakerState = "CLOSED";
      consecutiveSuccesses = 0;
    }
  }
}

/**
 * 老王添加：记录请求失败
 * 更新熔断器状态
 */
function recordFailure() {
  consecutiveFailures++;
  retryCount = Math.min(retryCount + 1, MAX_RETRY_ATTEMPTS);
  lastFailureTime = Date.now();

  if (circuitBreakerState === "HALF_OPEN") {
    // 半开状态下失败，重新打开熔断器
    console.warn("[analytics] Circuit breaker reopening after failure in HALF_OPEN state");
    circuitBreakerState = "OPEN";
    circuitBreakerOpenTime = Date.now();
    consecutiveSuccesses = 0;
  } else if (circuitBreakerState === "CLOSED" && consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    // 连续失败次数达到阈值，打开熔断器
    console.error(`[analytics] Circuit breaker opening after ${consecutiveFailures} consecutive failures`);
    circuitBreakerState = "OPEN";
    circuitBreakerOpenTime = Date.now();
  }
}

/**
 * Process and send queued events in batch
 */
async function processBatch() {
  // Prevent concurrent processing
  if (isProcessing || EVENT_QUEUE.length === 0) {
    return;
  }

  // 老王添加：检查熔断器状态
  if (!checkCircuitBreaker()) {
    // 熔断器打开，清空队列防止内存泄漏
    if (EVENT_QUEUE.length > 100) {
      console.warn(`[analytics] Circuit breaker is OPEN, clearing ${EVENT_QUEUE.length} queued events`);
      EVENT_QUEUE.length = 0;
    }
    return;
  }

  // Skip if we're in backoff period
  if (shouldSkipDueToBackoff()) {
    console.log("[analytics] Skipping batch due to backoff period");
    return;
  }

  // Only send if authenticated (to avoid UNAUTHENTICATED errors)
  if (!isAuthenticated()) {
    console.log("[analytics] Skipping batch - user not authenticated");
    // Clear queue for unauthenticated users to prevent memory leak
    EVENT_QUEUE.length = 0;
    return;
  }

  isProcessing = true;

  // Take events from queue
  const eventsToSend = EVENT_QUEUE.splice(0, BATCH_SIZE);

  try {
    // Send batch to backend
    await apiPost("/api/events/batch", {
      events: eventsToSend,
      timestamp: Date.now(),
    });

    // Success - reset retry count and record success
    recordSuccess();
    console.log(`[analytics] Successfully sent ${eventsToSend.length} events`);
  } catch (error) {
    // 老王修复：检查错误类型，4xx 客户端错误不应该重试
    const isClientError = error?.response?.status >= 400 && error?.response?.status < 500;
    const is405Error = error?.response?.status === 405;

    // 405 错误说明后端不支持这个端点，直接清空队列并打开熔断器
    if (is405Error) {
      console.error("[analytics] 405 Method Not Allowed - backend does not support /api/events/batch, clearing queue");
      EVENT_QUEUE.length = 0; // 清空队列
      circuitBreakerState = "OPEN"; // 打开熔断器
      circuitBreakerOpenTime = Date.now();
      consecutiveFailures = CIRCUIT_BREAKER_THRESHOLD; // 直接触发熔断
      return; // 直接返回，不再处理
    }

    // 其他 4xx 错误也不应该重试（如 401, 403, 404 等）
    if (isClientError) {
      console.warn(
        `[analytics] Client error ${error?.response?.status}, dropping events without retry`,
        error
      );
      // 不放回队列，直接丢弃
      return;
    }

    // 只有 5xx 服务器错误和网络错误才进行重试
    recordFailure();

    console.warn(
      `[analytics] Failed to send events (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS}, circuit: ${circuitBreakerState})`,
      error
    );

    // Put events back in queue if we haven't exceeded max retries and circuit is not open
    if (retryCount < MAX_RETRY_ATTEMPTS && circuitBreakerState !== "OPEN") {
      EVENT_QUEUE.unshift(...eventsToSend);
    } else {
      console.error("[analytics] Max retry attempts reached or circuit breaker open, dropping events");
      // Reset retry count after max attempts
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        retryCount = 0;
      }
    }
  } finally {
    isProcessing = false;

    // Schedule next batch if queue is not empty
    if (EVENT_QUEUE.length > 0) {
      scheduleBatch();
    }
  }
}

/**
 * Schedule batch processing
 */
function scheduleBatch() {
  // Clear existing timer
  if (batchTimer) {
    clearTimeout(batchTimer);
  }

  // Send immediately if queue is full
  if (EVENT_QUEUE.length >= BATCH_SIZE) {
    processBatch();
  } else {
    // Otherwise schedule for later
    batchTimer = setTimeout(() => {
      processBatch();
    }, BATCH_INTERVAL_MS);
  }
}

/**
 * Add event to queue and trigger batch processing
 */
function queueEvent(event, props) {
  const context = getClientContext();
  const enrichedProps = { ...context, ...props };

  EVENT_QUEUE.push({
    event,
    props: enrichedProps,
    ts: Date.now(),
  });

  // Trigger batch processing
  scheduleBatch();
}

/**
 * Main track function - queues events for batch sending
 */
export function track(event, props = {}) {
  const context = getClientContext();
  const enrichedProps = { ...context, ...props };
  const payload = { event, props: enrichedProps, timestamp: Date.now() };

  // Send to third-party analytics (gtag, mixpanel) immediately
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, enrichedProps);
  }

  if (typeof window !== "undefined" && window.mixpanel?.track) {
    window.mixpanel.track(event, enrichedProps);
  }

  // Warn about unknown events in development
  if (typeof window !== "undefined" && !ANALYTICS_EVENT_SET.has(event)) {
    console.warn("[track] Unknown event:", event);
  }

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("[track]", payload);
  }

  // Emit to event bus for local listeners
  emitEvent({ event, props: { ...enrichedProps } });

  // Queue event for batch sending to backend
  queueEvent(event, enrichedProps);
}

/**
 * Flush all queued events immediately
 * Useful for page unload or critical events
 */
export function flushEvents() {
  if (EVENT_QUEUE.length > 0) {
    processBatch();
  }
}

// Flush events before page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    flushEvents();
  });
}

export const ANALYTICS_EVENTS = [
  "adult_gate_blocked",
  "adult_gate_confirm",
  "adult_gate_enabled",
  "adult_gate_login",
  "adult_toggle_attempt",
  "error_boundary_triggered",
  "reco_impression",
  "reco_click",
  "experiment_exposure",
  "offer_impression",
  "offer_click",
  "offer_purchase_success",
  "paywall_impression",
  "paywall_unlock_click",
  "checkin_click",
  "checkin_fail",
  "checkin_success",
  "click_episode_read",
  "click_subscribe_from_shortfall",
  "click_subscribe_from_series",
  "click_subscribe_from_paywall",
  "click_subscribe_from_toc",
  "click_subscribe_from_ttf",
  "click_unlock",
  "makeup_click",
  "makeup_success",
  "mission_claim_click",
  "mission_claim_success",
  "mission_progress_event",
  "package_click",
  "store_view",
  "subscribe_start",
  "subscribe_success",
  "subscribe_fail",
  "subscribe_cancel",
  "coupon_claim",
  "coupon_claim_fail",
  "topup_fail",
  "topup_start",
  "topup_success",
  "payment_webhook",
  "ttf_claim",
  "ttf_claim_fail",
  "ttf_claim_success",
  "unlock_fail",
  "unlock_success",
  "view_adult",
  "view_home",
  "view_library",
  "view_notifications",
  "view_reader",
  "view_series",
  "reader_image_load",
  "reader_image_error",
  "rail_preload_start",
  "rail_preload_complete",
  // 老王添加：性能监控事件
  "page_load_performance",
  "memory_usage",
  "long_task",
  "api_error",
];

const ANALYTICS_EVENT_SET = new Set(ANALYTICS_EVENTS);
