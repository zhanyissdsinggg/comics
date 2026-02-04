"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = void 0;
exports.buildError = buildError;
exports.ERROR_CODES = {
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
function buildError(code, extra = {}) {
    return { error: code, ...extra };
}
