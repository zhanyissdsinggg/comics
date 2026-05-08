import { emitEvent } from "./eventBus";

// ============================================
// Analytics Event Queue with Batch Sending
// ============================================

const EVENT_QUEUE = [];
const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 5000;
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 1000;

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT_MS = 60000;
const CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 2;

let batchTimer = null;
let retryCount = 0;
let lastFailureTime = 0;
let isProcessing = false;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

let circuitBreakerState = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
let consecutiveFailures = 0;
let consecutiveSuccesses = 0;
let circuitBreakerOpenTime = 0;

function log(level, ...args) {
  if (IS_PRODUCTION) {
    return;
  }

  const fn = console[level] || console.log;
  fn(...args);
}

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

function getBaseUrl() {
  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.API_BASE_URL;

  if (envBase) {
    return envBase.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && !window.location.hostname.includes("localhost")) {
    return window.location.origin;
  }

  return "http://127.0.0.1:4000";
}

/**
 * Check if user is authenticated
 * Returns true if user has a valid session/token
 */
function isAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

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
 * Circuit breaker gate
 */
function checkCircuitBreaker() {
  const now = Date.now();

  switch (circuitBreakerState) {
    case "OPEN":
      if (now - circuitBreakerOpenTime >= CIRCUIT_BREAKER_TIMEOUT_MS) {
        log("log", "[analytics] Circuit breaker entering HALF_OPEN state");
        circuitBreakerState = "HALF_OPEN";
        consecutiveSuccesses = 0;
        return true;
      }
      log("log", "[analytics] Circuit breaker is OPEN, skipping request");
      return false;

    case "HALF_OPEN":
      return true;

    case "CLOSED":
    default:
      return true;
  }
}

function recordSuccess() {
  consecutiveFailures = 0;
  retryCount = 0;

  if (circuitBreakerState === "HALF_OPEN") {
    consecutiveSuccesses += 1;
    if (consecutiveSuccesses >= CIRCUIT_BREAKER_SUCCESS_THRESHOLD) {
      log("log", "[analytics] Circuit breaker closing after successful requests");
      circuitBreakerState = "CLOSED";
      consecutiveSuccesses = 0;
    }
  }
}

function recordFailure() {
  consecutiveFailures += 1;
  retryCount = Math.min(retryCount + 1, MAX_RETRY_ATTEMPTS);
  lastFailureTime = Date.now();

  if (circuitBreakerState === "HALF_OPEN") {
    log("warn", "[analytics] Circuit breaker reopening after failure in HALF_OPEN state");
    circuitBreakerState = "OPEN";
    circuitBreakerOpenTime = Date.now();
    consecutiveSuccesses = 0;
    return;
  }

  if (circuitBreakerState === "CLOSED" && consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    log("error", `[analytics] Circuit breaker opening after ${consecutiveFailures} consecutive failures`);
    circuitBreakerState = "OPEN";
    circuitBreakerOpenTime = Date.now();
  }
}

async function postEventsBatch(events) {
  try {
    const response = await fetch(`${getBaseUrl()}/api/events/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        events,
        timestamp: Date.now(),
      }),
    });

    const payload = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.status,
      error: payload?.error || response.statusText || "BATCH_SEND_FAILED",
    };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "NETWORK_ERROR",
    };
  }
}

/**
 * Process and send queued events in batch
 */
async function processBatch() {
  if (isProcessing || EVENT_QUEUE.length === 0) {
    return;
  }

  if (!checkCircuitBreaker()) {
    if (EVENT_QUEUE.length > 100) {
      log("warn", `[analytics] Circuit breaker is OPEN, clearing ${EVENT_QUEUE.length} queued events`);
      EVENT_QUEUE.length = 0;
    }
    return;
  }

  if (shouldSkipDueToBackoff()) {
    log("log", "[analytics] Skipping batch due to backoff period");
    return;
  }

  if (!isAuthenticated()) {
    log("log", "[analytics] Skipping batch - user not authenticated");
    EVENT_QUEUE.length = 0;
    return;
  }

  isProcessing = true;
  const eventsToSend = EVENT_QUEUE.splice(0, BATCH_SIZE);

  try {
    const response = await postEventsBatch(eventsToSend);

    if (response.ok) {
      recordSuccess();
      log("log", `[analytics] Successfully sent ${eventsToSend.length} events`);
      return;
    }

    const isClientError = response.status >= 400 && response.status < 500;
    const is405Error = response.status === 405;

    if (is405Error) {
      log("error", "[analytics] 405 Method Not Allowed - backend does not support /api/events/batch, clearing queue");
      EVENT_QUEUE.length = 0;
      circuitBreakerState = "OPEN";
      circuitBreakerOpenTime = Date.now();
      consecutiveFailures = CIRCUIT_BREAKER_THRESHOLD;
      return;
    }

    if (isClientError) {
      log(
        "warn",
        `[analytics] Client error ${response.status}, dropping events without retry`,
        response.error
      );
      return;
    }

    recordFailure();
    log(
      "warn",
      `[analytics] Failed to send events (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS}, circuit: ${circuitBreakerState})`,
      response.error
    );

    if (retryCount < MAX_RETRY_ATTEMPTS && circuitBreakerState !== "OPEN") {
      EVENT_QUEUE.unshift(...eventsToSend);
    } else {
      log("error", "[analytics] Max retry attempts reached or circuit breaker open, dropping events");
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        retryCount = 0;
      }
    }
  } finally {
    isProcessing = false;

    if (EVENT_QUEUE.length > 0) {
      scheduleBatch();
    }
  }
}

/**
 * Schedule batch processing
 */
function scheduleBatch() {
  if (batchTimer) {
    clearTimeout(batchTimer);
  }

  if (EVENT_QUEUE.length >= BATCH_SIZE) {
    processBatch();
    return;
  }

  batchTimer = setTimeout(() => {
    processBatch();
  }, BATCH_INTERVAL_MS);
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

  scheduleBatch();
}

/**
 * Main track function - queues events for batch sending
 */
export function track(event, props = {}) {
  const context = getClientContext();
  const enrichedProps = { ...context, ...props };
  const payload = { event, props: enrichedProps, timestamp: Date.now() };

  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, enrichedProps);
  }

  if (typeof window !== "undefined" && window.mixpanel?.track) {
    window.mixpanel.track(event, enrichedProps);
  }

  if (typeof window !== "undefined" && !ANALYTICS_EVENT_SET.has(event)) {
    log("warn", "[track] Unknown event:", event);
  }

  if (process.env.NODE_ENV === "development") {
    log("log", "[track]", payload);
  }

  emitEvent({ event, props: { ...enrichedProps } });
  queueEvent(event, enrichedProps);
}

/**
 * Flush all queued events immediately
 */
export function flushEvents() {
  if (EVENT_QUEUE.length > 0) {
    processBatch();
  }
}

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
  "page_load_performance",
  "memory_usage",
  "long_task",
  "api_error",
];

const ANALYTICS_EVENT_SET = new Set(ANALYTICS_EVENTS);
