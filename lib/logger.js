import { randomUUID } from "crypto";

export function createRequestId() {
  try {
    return `req_${randomUUID()}`;
  } catch (err) {
    return `req_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }
}

export function logInfo(event, payload) {
  console.log(`[info] ${event}`, payload || {});
}

export function logWarn(event, payload) {
  console.warn(`[warn] ${event}`, payload || {});
}

export function logError(event, payload) {
  console.error(`[error] ${event}`, payload || {});
}
