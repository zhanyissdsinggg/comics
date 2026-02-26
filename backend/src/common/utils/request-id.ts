export function createRequestId() {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}
