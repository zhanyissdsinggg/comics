import { emitToast } from "./toastBus";

const friendlyMessages = {
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "You do not have access.",
  ADULT_GATED: "Adult content is locked. Please verify.",
  INSUFFICIENT_POINTS: "Not enough POINTS.",
  TTF_NOT_READY: "This free claim is not ready yet.",
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
