export const ERROR_CODES = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_REQUEST: "INVALID_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  ADULT_GATED: "ADULT_GATED",
  INSUFFICIENT_POINTS: "INSUFFICIENT_POINTS",
  TTF_NOT_READY: "TTF_NOT_READY",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
};

export function buildError(code: string, extra: Record<string, any> = {}) {
  return { error: code, ...extra };
}
