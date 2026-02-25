export const ERROR_CODES = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  ADULT_GATED: "ADULT_GATED",
  INSUFFICIENT_POINTS: "INSUFFICIENT_POINTS",
  TTF_NOT_READY: "TTF_NOT_READY",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
  INVALID_REQUEST: "INVALID_REQUEST",
};

export function buildErrorPayload(code, extra) {
  return {
    error: code,
    ...(extra || {}),
  };
}
