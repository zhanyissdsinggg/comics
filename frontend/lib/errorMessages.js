import { emitToast } from "./toastBus";

const friendlyMessages = {
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "You do not have access.",
  ADULT_GATED: "Mature content is locked. Please verify your age.",
  INSUFFICIENT_POINTS: "Not enough points.",
  BILLING_PROVIDER_REQUIRED:
    "Secure checkout is not configured yet. Purchases, refunds, and subscriptions are temporarily unavailable.",
  TTF_NOT_READY: "This free unlock is not ready yet.",
  RATE_LIMITED: "Too many requests. Please try again soon.",
  INVALID_REQUEST: "Invalid request. Please retry.",
  NOT_FOUND: "Content not found.",
  INTERNAL: "Server error. Please retry.",
};

export function getFriendlyMessage(errorCode, fallback) {
  return friendlyMessages[errorCode] || fallback || "Request failed.";
}

export function toastError(errorCode, fallback) {
  emitToast({ message: getFriendlyMessage(errorCode, fallback) });
}
