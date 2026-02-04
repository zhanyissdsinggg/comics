import { emitEvent } from "./eventBus";
import { apiPost } from "./apiClient";

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

export function track(event, props = {}) {
  const context = getClientContext();
  const enrichedProps = { ...context, ...props };
  const payload = { event, props: enrichedProps, timestamp: Date.now() };

  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, enrichedProps);
    return;
  }

  if (typeof window !== "undefined" && window.mixpanel?.track) {
    window.mixpanel.track(event, enrichedProps);
    return;
  }

  if (typeof window !== "undefined" && !ANALYTICS_EVENT_SET.has(event)) {
    console.warn("[track] Unknown event:", event);
  }

  console.log("[track]", payload);
  emitEvent({ event, props: { ...enrichedProps } });
  apiPost("/api/events", { event, props: enrichedProps, ts: payload.timestamp }).catch(() => {});
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
];

const ANALYTICS_EVENT_SET = new Set(ANALYTICS_EVENTS);
