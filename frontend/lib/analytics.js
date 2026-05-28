import { emitEvent } from "./eventBus";
import { normalizeContentMode } from "./contentMode";
import {
  getGoogleTrackingConfig,
  getSnapTrackingConfig,
  readTrackingSettingsSnapshot,
} from "./trackingSettings";

const EVENT_QUEUE = [];
const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 5000;
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 1000;

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT_MS = 60000;
const CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 2;
const CONTENT_MODE_STORAGE_KEY = "mn_adult_mode";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const PAGE_VIEW_EVENT = "page_view";
const CONTENT_MODE_EVENTS = new Set([
  "content_mode_enter_adult",
  "content_mode_exit_adult",
  "content_mode_restore",
  "content_mode_invalid_state",
]);
const SEARCH_EVENTS = new Set([
  "search_submit",
  "adult_search_submit",
  "search_zero_result",
  "search_result_click",
]);
const ADULT_SENSITIVE_EVENTS = new Set([
  "adult_gate_view",
  "adult_gate_confirm",
  "adult_gate_exit",
  "adult_content_view",
  "adult_reader_blocked",
  "adult_reader_enter",
  "adult_search_submit",
]);
const PII_KEYS = new Set([
  "email",
  "user_email",
  "name",
  "full_name",
  "first_name",
  "last_name",
  "real_name",
  "birthday",
  "birth_date",
  "dob",
  "phone",
  "phone_number",
]);
const TITLE_KEYS = new Set([
  "title",
  "series_title",
  "episode_title",
  "content_title",
]);
const QUERY_KEYS = new Set([
  "q",
  "query",
  "search",
  "search_query",
  "keyword",
  "term",
]);
const AD_PLATFORM_ALLOWED_KEYS = new Set([
  "page_path",
  "content_mode",
  "content_type",
  "series_id",
  "episode_id",
  "target_episode_id",
  "genre",
  "source_section",
  "position",
  "is_adult",
  "access_type",
  "device_hint",
  "milestone",
  "progress_percent",
  "result_count",
  "has_query",
  "query_length",
  "format",
  "view",
  "sort",
  "purchase_type",
  "value",
  "currency",
  "status",
  "error_code",
  "plan_id",
  "package_id",
]);

const SNAP_EVENT_MAP = {
  [PAGE_VIEW_EVENT]: "PAGE_VIEW",
  adult_search_submit: "SEARCH",
  search_submit: "SEARCH",
  purchase_success: "PURCHASE",
  checkout_start: "START_CHECKOUT",
  signup_complete: "SIGN_UP",
  login_complete: "LOGIN",
  subscribe_click: "START_CHECKOUT",
  paywall_view: "VIEW_CONTENT",
  unlock_attempt: "START_CHECKOUT",
  unlock_success: "PURCHASE",
};

export const ANALYTICS_EVENTS = [
  PAGE_VIEW_EVENT,
  "content_mode_enter_adult",
  "content_mode_exit_adult",
  "content_mode_restore",
  "content_mode_invalid_state",
  "adult_gate_view",
  "adult_gate_confirm",
  "adult_gate_exit",
  "adult_content_view",
  "adult_reader_blocked",
  "adult_reader_enter",
  "adult_search_submit",
  "normal_content_view",
  "home_view",
  "story_impression",
  "story_click",
  "genre_filter_click",
  "ranking_filter_click",
  "search_open",
  "search_submit",
  "search_zero_result",
  "search_result_click",
  "episode_start",
  "episode_progress",
  "episode_complete",
  "next_chapter_click",
  "previous_chapter_click",
  "reader_settings_open",
  "reader_theme_change",
  "bookmark_add",
  "bookmark_remove",
  "interactive_story_start",
  "interactive_choice_view",
  "interactive_choice_click",
  "interactive_choice_locked",
  "interactive_choice_unlock",
  "interactive_ending_reached",
  "interactive_restart",
  "interactive_resume",
  "interactive_story_complete",
  "signup_start",
  "signup_complete",
  "login_start",
  "login_complete",
  "paywall_view",
  "unlock_attempt",
  "unlock_success",
  "subscribe_click",
  "checkout_start",
  "purchase_success",
  "purchase_failed",
  "vip_shop_view",
  "offer_impression",
  "offer_click",
  "coupon_claim",
  "coupon_claim_fail",
  "api_error",
  "error_boundary_triggered",
];

const LEGACY_EVENT_ALIASES = {
  adult_gate_enabled: "content_mode_enter_adult",
  adult_gate_disabled: "content_mode_exit_adult",
  view_home: "home_view",
  reco_impression: "story_impression",
  reco_click: "story_click",
  featured_series_click: "story_click",
  store_view: "vip_shop_view",
  paywall_impression: "paywall_view",
  paywall_unlock_click: "unlock_attempt",
  click_unlock: "unlock_attempt",
  subscribe_cta_click: "subscribe_click",
  subscribe_start: "checkout_start",
  subscribe_success: "purchase_success",
  subscribe_fail: "purchase_failed",
  topup_start: "checkout_start",
  topup_success: "purchase_success",
  topup_fail: "purchase_failed",
  offer_purchase_success: "purchase_success",
  interactive_choice_select: "interactive_choice_click",
};

const ANALYTICS_EVENT_SET = new Set([
  ...ANALYTICS_EVENTS,
  ...Object.keys(LEGACY_EVENT_ALIASES),
]);

let batchTimer = null;
let retryCount = 0;
let lastFailureTime = 0;
let isProcessing = false;

let circuitBreakerState = "CLOSED";
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

function toSnakeCase(key) {
  return String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getCurrentContentMode() {
  if (typeof window === "undefined") {
    return "normal";
  }

  try {
    const stored = window.localStorage.getItem(CONTENT_MODE_STORAGE_KEY);
    return normalizeContentMode(stored === "1" ? "adult" : "normal");
  } catch {
    return "normal";
  }
}

function getClientContext() {
  if (typeof window === "undefined") {
    return {
      page_path: "",
      referrer: "",
      content_mode: "normal",
      device_hint: "desktop",
    };
  }

  const pagePath = window.location?.pathname || "";
  const referrer = document?.referrer || "";
  const deviceHint =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 767px)").matches
      ? "mobile"
      : "desktop";

  return {
    page_path: pagePath,
    referrer,
    content_mode: getCurrentContentMode(),
    device_hint: deviceHint,
  };
}

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.API_BASE_URL;

  if (envBase) {
    return envBase.replace(/\/$/, "");
  }

  return "http://127.0.0.1:4000";
}

function getBackoffDelay() {
  return Math.min(INITIAL_BACKOFF_MS * Math.pow(2, retryCount), 30000);
}

function shouldSkipDueToBackoff() {
  if (retryCount === 0) {
    return false;
  }

  const backoffDelay = getBackoffDelay();
  const timeSinceFailure = Date.now() - lastFailureTime;
  return timeSinceFailure < backoffDelay;
}

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
      log(
        "log",
        "[analytics] Circuit breaker closing after successful requests",
      );
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
    log(
      "warn",
      "[analytics] Circuit breaker reopening after failure in HALF_OPEN state",
    );
    circuitBreakerState = "OPEN";
    circuitBreakerOpenTime = Date.now();
    consecutiveSuccesses = 0;
    return;
  }

  if (
    circuitBreakerState === "CLOSED" &&
    consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD
  ) {
    log(
      "error",
      `[analytics] Circuit breaker opening after ${consecutiveFailures} consecutive failures`,
    );
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

async function processBatch() {
  if (isProcessing || EVENT_QUEUE.length === 0) {
    return;
  }

  if (!checkCircuitBreaker()) {
    if (EVENT_QUEUE.length > 100) {
      log(
        "warn",
        `[analytics] Circuit breaker is OPEN, clearing ${EVENT_QUEUE.length} queued events`,
      );
      EVENT_QUEUE.length = 0;
    }
    return;
  }

  if (shouldSkipDueToBackoff()) {
    log("log", "[analytics] Skipping batch due to backoff period");
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
      log(
        "error",
        "[analytics] 405 Method Not Allowed - backend does not support /api/events/batch, clearing queue",
      );
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
        response.error,
      );
      return;
    }

    recordFailure();
    log(
      "warn",
      `[analytics] Failed to send events (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS}, circuit: ${circuitBreakerState})`,
      response.error,
    );

    if (retryCount < MAX_RETRY_ATTEMPTS && circuitBreakerState !== "OPEN") {
      EVENT_QUEUE.unshift(...eventsToSend);
    } else {
      log(
        "error",
        "[analytics] Max retry attempts reached or circuit breaker open, dropping events",
      );
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

function scheduleBatch() {
  if (batchTimer) {
    clearTimeout(batchTimer);
  }

  if (EVENT_QUEUE.length >= BATCH_SIZE) {
    void processBatch();
    return;
  }

  batchTimer = setTimeout(() => {
    void processBatch();
  }, BATCH_INTERVAL_MS);
}

function normalizePrimitive(value) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    const parts = value.map((item) => normalizePrimitive(item)).filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }

  if (typeof value === "object") {
    for (const key of ["id", "slug", "label", "name", "title", "value"]) {
      const nextValue = normalizePrimitive(value?.[key]);
      if (nextValue !== undefined) {
        return nextValue;
      }
    }
  }

  return undefined;
}

function normalizeParams(props = {}) {
  const normalized = {};

  Object.entries(props || {}).forEach(([rawKey, rawValue]) => {
    const key = toSnakeCase(rawKey);
    const value = normalizePrimitive(rawValue);
    if (value !== undefined) {
      normalized[key] = value;
    }
  });

  if (!normalized.page_path) {
    normalized.page_path = getClientContext().page_path;
  }

  if (!normalized.content_mode) {
    normalized.content_mode = getCurrentContentMode();
  } else {
    normalized.content_mode = normalizeContentMode(normalized.content_mode);
  }

  if (!normalized.device_hint) {
    normalized.device_hint = getClientContext().device_hint;
  }

  if (!normalized.content_type) {
    const rawType =
      normalized.series_type ||
      normalized.type ||
      normalized.kind ||
      normalized.format;
    const nextType = normalizeText(rawType);
    if (nextType === "comic" || nextType === "comics") {
      normalized.content_type = "comic";
    } else if (nextType === "novel" || nextType === "novels") {
      normalized.content_type = "novel";
    } else if (nextType === "interactive") {
      normalized.content_type = "interactive";
    }
  }

  if (!normalized.source_section) {
    normalized.source_section =
      normalized.entry_point ||
      normalized.rail_name ||
      normalized.featured_view ||
      normalized.surface;
  }

  if (!normalized.progress_percent && typeof normalized.percent === "number") {
    normalized.progress_percent = normalized.percent;
  }

  if (normalized.is_adult !== true) {
    const adultLike = normalizeText(normalized.is_adult);
    if (adultLike === "true" || adultLike === "1") {
      normalized.is_adult = true;
    } else if (adultLike === "false" || adultLike === "0") {
      normalized.is_adult = false;
    }
  }

  return normalized;
}

function addSearchPrivacyMetadata(params) {
  let queryLength = 0;
  let hasQuery = false;

  Object.keys(params).forEach((key) => {
    if (!QUERY_KEYS.has(key)) {
      return;
    }

    const queryValue = String(params[key] || "").trim();
    if (queryValue) {
      hasQuery = true;
      queryLength = Math.max(queryLength, queryValue.length);
    }

    delete params[key];
  });

  if (hasQuery) {
    params.has_query = true;
    params.query_length = queryLength;
  }

  return params;
}

function removeSensitiveKeys(params) {
  Object.keys(params).forEach((key) => {
    if (PII_KEYS.has(key)) {
      delete params[key];
      return;
    }

    if (TITLE_KEYS.has(key)) {
      delete params[key];
    }
  });

  return params;
}

function isAdultSensitiveEvent(eventName, params) {
  if (ADULT_SENSITIVE_EVENTS.has(eventName)) {
    return true;
  }

  if (params.is_adult === true) {
    return true;
  }

  return params.content_mode === "adult" && eventName.includes("adult");
}

function sanitizeForAdPlatforms(eventName, params) {
  const sanitized = {};

  Object.entries(params).forEach(([key, value]) => {
    if (AD_PLATFORM_ALLOWED_KEYS.has(key)) {
      sanitized[key] = value;
    }
  });

  if (isAdultSensitiveEvent(eventName, params)) {
    delete sanitized.series_id;
    delete sanitized.episode_id;
    delete sanitized.target_episode_id;
    delete sanitized.plan_id;
    delete sanitized.package_id;
    delete sanitized.value;
    delete sanitized.currency;
    sanitized.is_adult = true;
  }

  return sanitized;
}

function buildEventName(eventName) {
  const rawName = String(eventName || "").trim();
  return LEGACY_EVENT_ALIASES[rawName] || rawName || "unknown_event";
}

function buildPayload(eventName, props = {}, eventKind = "event") {
  const canonicalEvent = buildEventName(eventName);
  const baseContext = getClientContext();
  const normalizedProps = normalizeParams({
    ...baseContext,
    ...props,
  });

  addSearchPrivacyMetadata(normalizedProps);
  removeSensitiveKeys(normalizedProps);

  if (CONTENT_MODE_EVENTS.has(canonicalEvent)) {
    normalizedProps.content_mode = normalizeContentMode(
      normalizedProps.content_mode || getCurrentContentMode(),
    );
  }

  if (ADULT_SENSITIVE_EVENTS.has(canonicalEvent)) {
    normalizedProps.is_adult = true;
  }

  if (eventKind === "conversion" && !normalizedProps.access_type) {
    normalizedProps.access_type = "paid";
  }

  const providerProps = sanitizeForAdPlatforms(canonicalEvent, {
    ...normalizedProps,
  });

  return {
    event: canonicalEvent,
    legacy_event: eventName !== canonicalEvent ? eventName : "",
    props: normalizedProps,
    providerProps,
    eventKind,
    ts: Date.now(),
  };
}

function ensureGoogleTag() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const { measurementId, adsConversionId } = getGoogleTrackingConfig(
    readTrackingSettingsSnapshot(),
  );
  const googleIds = [measurementId, adsConversionId].filter(Boolean);

  if (googleIds.length === 0) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    typeof window.gtag === "function"
      ? window.gtag
      : function gtag() {
          window.dataLayer.push(arguments);
        };

  if (!window.__mnGoogleTagScriptLoaded) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      measurementId || adsConversionId,
    )}`;
    script.setAttribute("data-mn-analytics-script", "google");
    document.head.appendChild(script);
    window.__mnGoogleTagScriptLoaded = true;
    window.gtag("js", new Date());
  }

  const configuredIds = window.__mnGoogleTagConfiguredIds || new Set();
  googleIds.forEach((id) => {
    if (configuredIds.has(id)) {
      return;
    }
    window.gtag("config", id, { send_page_view: false });
    configuredIds.add(id);
  });
  window.__mnGoogleTagConfiguredIds = configuredIds;
}

function ensureSnapPixel() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const { pixelId } = getSnapTrackingConfig(readTrackingSettingsSnapshot());
  if (!pixelId) {
    return;
  }

  if (typeof window.snaptr !== "function") {
    const snaptr = function snaptr() {
      snaptr.handleRequest
        ? snaptr.handleRequest.apply(snaptr, arguments)
        : snaptr.queue.push(arguments);
    };
    snaptr.queue = [];
    window.snaptr = snaptr;

    if (!window.__mnSnapPixelScriptLoaded) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://sc-static.net/scevent.min.js";
      script.setAttribute("data-mn-analytics-script", "snap");
      document.head.appendChild(script);
      window.__mnSnapPixelScriptLoaded = true;
    }
  }

  if (window.__mnSnapPixelId === pixelId) {
    return;
  }

  window.snaptr("init", pixelId);
  window.__mnSnapPixelId = pixelId;
}

function ensurePlatformAdapters() {
  ensureGoogleTag();
  ensureSnapPixel();
}

export function primeAnalyticsProviders() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    ensurePlatformAdapters();
  } catch {
    // ignore analytics provider bootstrap errors
  }
}

function sendToGoogle(payload) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  try {
    if (payload.event === PAGE_VIEW_EVENT) {
      window.gtag("event", PAGE_VIEW_EVENT, payload.providerProps);
      return;
    }

    window.gtag("event", payload.event, payload.providerProps);
  } catch {
    // ignore analytics provider errors
  }
}

function mapSnapEventName(payload) {
  return SNAP_EVENT_MAP[payload.event] || "";
}

function sendToSnap(payload) {
  if (typeof window === "undefined" || typeof window.snaptr !== "function") {
    return;
  }

  const snapEventName = mapSnapEventName(payload);
  if (!snapEventName) {
    return;
  }

  try {
    window.snaptr("track", snapEventName, payload.providerProps);
  } catch {
    // ignore analytics provider errors
  }
}

function sendToMixpanel(payload) {
  if (
    typeof window === "undefined" ||
    typeof window.mixpanel?.track !== "function"
  ) {
    return;
  }

  try {
    window.mixpanel.track(payload.event, payload.props);
  } catch {
    // ignore analytics provider errors
  }
}

function queueEvent(payload) {
  EVENT_QUEUE.push({
    event: payload.event,
    legacyEvent: payload.legacy_event || undefined,
    props: payload.props,
    ts: payload.ts,
  });

  scheduleBatch();
}

function dispatchPayload(payload) {
  if (
    typeof window !== "undefined" &&
    !ANALYTICS_EVENT_SET.has(payload.event)
  ) {
    log("warn", "[track] Unknown event:", payload.event);
  }

  if (process.env.NODE_ENV === "development") {
    log("log", "[track]", {
      event: payload.event,
      props: payload.props,
      ts: payload.ts,
    });
  }

  emitEvent({ event: payload.event, props: { ...payload.props } });
  queueEvent(payload);

  if (typeof window !== "undefined") {
    primeAnalyticsProviders();
    sendToGoogle(payload);
    sendToSnap(payload);
    sendToMixpanel(payload);
  }
}

export function trackEvent(eventName, props = {}) {
  const payload = buildPayload(eventName, props, "event");
  dispatchPayload(payload);
}

export function trackPageView(path, props = {}) {
  const payload = buildPayload(
    PAGE_VIEW_EVENT,
    {
      ...props,
      pagePath: String(
        path || props.page_path || getClientContext().page_path || "",
      ),
    },
    "pageview",
  );
  dispatchPayload(payload);
}

export function trackConversion(eventName, props = {}) {
  const payload = buildPayload(eventName, props, "conversion");
  dispatchPayload(payload);
}

export function track(eventName, props = {}) {
  trackEvent(eventName, props);
}

export function flushEvents() {
  if (EVENT_QUEUE.length > 0) {
    void processBatch();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    flushEvents();
  });
}
